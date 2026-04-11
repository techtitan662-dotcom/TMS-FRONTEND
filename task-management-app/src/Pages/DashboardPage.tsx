import { useState, useCallback, useRef, useEffect, useMemo, useDeferredValue, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
    ListTodo,
    Home,
    PlusCircle,
    AlertCircle,
    CheckCircle,
    Clock,
    Grid,
    List,
    Filter,
    BarChart3,
    User,
    Star,
    Trophy,
    Crown,
    MessageSquare,
    X,
    Send,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AllTasksPage from './AllTasksPage';
import CalendarView from './CalendarView';
import TeamPage from './TeamPage';
import UserProfilePage from './UserProfilePage';
import BrandsListPage from './BrandsListPage';
import BrandDetailPage from './BrandDetailPage';
import AccessPage from './AccessPage';
import CompanyBrandTaskTypePage from './CompanyBrandTaskTypePage';
import AssignPage from './AssignPage';
import ReviewsPage from './ReviewsPage';
import OtherWorkPage from './OtherWorkPage';
import MdImpexStrikePage from './MdImpexStrikePage';
import NewMdImpexStrikePage from './NewMdImpexStrikePage';
import MdImpexAccessPage from './MdImpexAccessPage';
import ManagerMonthlyRankingPage from './ManagerMonthlyRankingPage';
import PowerStarOfTheMonthPage from './PowerStarOfTheMonthPage';
import SpeedEcomReassignPage from './SpeedEcomReassignPage';
import AdvancedFilters from './AdvancedFilters';
const AnalyzePage = lazy(() => import('./AnalyzePage'));
import { DashboardPageSkeleton } from '../Components/LoadingSkeletons';
import EmployeeOfTheMonthCard from '../Components/EmployeeOfTheMonthCard';
import TaskReminderCard from '../Components/TaskReminderCard';
import AddTaskModal from './DashboardModals/AddTaskModal';
import MdImpexAddTaskModal from './DashboardModals/MdImpexAddTaskModal';
import EditTaskModal from './DashboardModals/EditTaskModal';
import MdImpexEditTaskModal from './DashboardModals/MdImpexEditTaskModal';
import SendReminderModal from './DashboardModals/SendReminderModal';
import BulkAddBrandsModal from './DashboardModals/BulkAddBrandsModal';
import BulkAddCompaniesModal from './DashboardModals/BulkAddCompaniesModal';
import BulkAddTaskTypesModal from './DashboardModals/BulkAddTaskTypesModal';
import ManagerAddBrandModal from './DashboardModals/ManagerAddBrandModal';
import AdminHeadlineManager from '../Components/AdminHeadlineManager';

import type {
    Brand,
    CommentType,
    Company,
    Task,
    TaskHistory,
    TaskPriority,
    TaskStatus,
    TaskTypeItem,
    UserType,
} from '../Types/Types';
import { taskService } from '../Services/Task.services';
import apiClient from '../Services/apiClient';
import { authService } from '../Services/User.Services';
import { brandService } from '../Services/Brand.service';
import { companyService } from '../Services/Company.service';
import { taskTypeService } from '../Services/TaskType.service';
import mdImpexAccessService from '../Services/MdImpexAccess.services';
import { companyTaskTypeService } from '../Services/CompanyTaskType.service';
import { companyBrandTaskTypeService } from '../Services/CompanyBrandTaskType.service';
import { assignService } from '../Services/Assign.service';
import { routepath } from '../Routes/route';
import PersonalTasksPage from './PersonalTasksPage';
import AssignedByMe from './AssignedByMe';
import AssignedToMe from './AssignedToMe';
import { useAppDispatch, useAppSelector } from '../Store/hooks';
import { getDashboardSpotlightOverrideForEmail } from '../utils/dashboardSpotlightAccess';
import {
    fetchTasks as fetchTasksThunk,
    selectAllTasks,
    taskAdded,
    taskRemoved,
    taskUpserted,
    tasksAddedMany,
} from '../Store/tasksSlice';
import {
    fetchUsers as fetchUsersThunk,
    selectAllUsers,
    userUpserted,
    userRemoved,
    userOnlineStatusChanged,
    usersSetAll,
} from '../Store/usersSlice';
import {
    fetchBrands as fetchBrandsThunk,
    selectAllBrands,
    brandUpserted,
    brandRemoved,
    brandsSetAll,
} from '../Store/brandsSlice';
import TaskVirtualList from '../Components/TaskVirtualList';
import {
    stripDeletedEmailSuffix,
    monthKeyOfDate,
    isOverdueFn
} from '../utils/dashboardUtils';
import { useDashboardStats } from '../Hooks/useDashboardStats';

type TaskReminderClientItem = {
    id: string;
    taskId: string;
    fromEmail: string;
    message: string;
    createdAt?: string | Date | null;
    task?: {
        title?: string;
        dueDate?: string | Date | null;
        status?: string;
        companyName?: string;
        brand?: string;
    };
};

const resolveSocketUrl = () => {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const isDev = Boolean(import.meta.env.DEV);
    if (typeof envSocketUrl === 'string' && envSocketUrl.trim().length > 0) {
        return String(envSocketUrl).trim().replace(/\/+$/, '');
    }
    const apiBase =
        (typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0)
            ? envBaseUrl
            : (isDev ? 'http://localhost:8100/api' : 'https://tms-backend-sand.vercel.app/api');
    const trimmed = String(apiBase || '').trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? (trimmed.slice(0, -4) || '/') : (trimmed || '/');
};


interface NewTaskForm {
    title: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    taskType: string;
    companyName: string;
    brand: string;
}

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

interface StatMeta {
    name: string;
    value: number;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
    icon: any;
    id: string;
    color: string;
    bgColor: string;
}

interface FilterState {
    status: string;
    priority: string;
    assigned: string;
    date: string;
    taskType: string;
    company: string;
    brand: string;
    rm: string;
    sort?: string;
}

const DashboardPage = () => {

    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const [currentUser, setCurrentUser] = useState<UserType>(() => {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            // ignore
        }
        return {
            id: '',
            name: '',
            email: '',
            role: '',
            password: '',
            company: '',
            companyName: '',
            phone: '',
            avatar: '',
            department: '',
            position: '',
            joinDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            permissions: {},
            isActive: true,
            isEmployee: true
        } as any;
    });
    const tasks = useAppSelector(selectAllTasks);
    const users = useAppSelector(selectAllUsers);
    const apiBrands = useAppSelector(selectAllBrands);
    const assignedByMePendingCount = useMemo(() => {
        if (!currentUser?.email) return 0;
        return tasks.filter(t => {
            const assignedByEmail = typeof t.assignedBy === 'object' ? t.assignedBy?.email : t.assignedBy;
            return assignedByEmail === currentUser.email && t.status === 'completed' && !t.completedApproval;
        }).length;
    }, [tasks, currentUser?.email]);
    const assignedToMePendingCount = useMemo(() => {
        if (!currentUser?.email) return 0;
        return tasks.filter(t => {
            const assignedToEmail = typeof t.assignedTo === 'object' ? t.assignedTo?.email : t.assignedTo;
            const assignedToUserEmail = (t as any).assignedToUser?.email;
            const isAssignedToMe = assignedToEmail === currentUser.email || assignedToUserEmail === currentUser.email;
            return isAssignedToMe && t.status === 'pending';
        }).length;
    }, [tasks, currentUser?.email]);
    const seenTaskIdsRef = useRef<Set<string>>(new Set());
    const hasFetchedTasksOnceRef = useRef(false);
    const [selectedStatFilter, setSelectedStatFilter] = useState<string>('all');
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showMdImpexEditModal, setShowMdImpexEditModal] = useState(false);
    const [showBulkBrandModal, setShowBulkBrandModal] = useState(false);
    const [showManagerAddBrandModal, setShowManagerAddBrandModal] = useState(false);
    const [managerBrandName, setManagerBrandName] = useState('');
    const [isCreatingManagerBrand, setIsCreatingManagerBrand] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const usersRef = useRef<UserType[]>([]);
    const [sendingReminderByTaskId, setSendingReminderByTaskId] = useState<Record<string, boolean>>({});
    const [sendReminderTask, setSendReminderTask] = useState<Task | null>(null);
    const [sendReminderOpen, setSendReminderOpen] = useState(false);
    const [unreadReminders, setUnreadReminders] = useState<TaskReminderClientItem[]>([]);
    const [activeReminderId, setActiveReminderId] = useState<string>('');
    const SUPPORTING_FETCH_TTL_MS = 5 * 60_000;
    const MD_IMPEX_COMPANY_NAME = 'MD Impex';
    const usersFetchedAtRef = useRef<number | null>(null);
    const brandsFetchedAtRef = useRef<number | null>(null);
    const companiesFetchedAtRef = useRef<number | null>(null);
    const taskTypesFetchedAtRef = useRef<number | null>(null);
    const usersFetchInFlightRef = useRef<Promise<void> | null>(null);
    const brandsFetchInFlightRef = useRef<Promise<void> | null>(null);
    const companiesFetchInFlightRef = useRef<Promise<void> | null>(null);
    const taskTypesFetchInFlightRef = useRef<Promise<void> | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [showTaskCommentSidebar, setShowTaskCommentSidebar] = useState(false);
    const [commentSidebarTask, setCommentSidebarTask] = useState<Task | null>(null);
    const [commentDraft, setCommentDraft] = useState('');
    const [commentSidebarLoading, setCommentSidebarLoading] = useState(false);
    const [commentSidebarLoadingComments, setCommentSidebarLoadingComments] = useState(false);
    const [commentSidebarCommentsByTaskId, setCommentSidebarCommentsByTaskId] = useState<Record<string, CommentType[]>>({});
    const [speedEcomReassignTask, setSpeedEcomReassignTask] = useState<Task | null>(null);
    const [isSpeedEcomReassignSubmitting, setIsSpeedEcomReassignSubmitting] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(tasks.length === 0);
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [taskPage, setTaskPage] = useState(1);
    const [reviewsMonth, setReviewsMonth] = useState<string>(() => monthKeyOfDate(new Date()));
    const [reviewedTasksForSummary, setReviewedTasksForSummary] = useState<Task[]>([]);
    const [allMdImpexUsers, setAllMdImpexUsers] = useState<any[]>([]);
    const [, setMdAllowedMembers] = useState<UserType[]>([]);
    const [mdAllowedTaskTypes, setMdAllowedTaskTypes] = useState<string[]>([]);
    const [mdAllowedBrands, setMdAllowedBrands] = useState<string[]>([]);

    const { employeeOfTheMonth, pendingManagerReviewTasks } = useDashboardStats({
        tasks,
        reviewedTasksForSummary,
        reviewsMonth,
        users,
        allMdImpexUsers,
        currentUser
    });
    const [reviewModalTaskId, setReviewModalTaskId] = useState<string | null>(null);
    const [reviewModalStars, setReviewModalStars] = useState<number>(0);
    const [reviewModalComment, setReviewModalComment] = useState<string>('');
    const [reviewModalSubmitting, setReviewModalSubmitting] = useState(false);
    const notifiedReviewTaskIdsRef = useRef<Set<string>>(new Set());
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [currentView, setCurrentView] = useState<
        | 'dashboard'
        | 'all-tasks'
        | 'calendar'
        | 'analyze'
        | 'team'
        | 'profile'
        | 'brands'
        | 'brand-detail'
        | 'access'
        | 'company-brand-task-types'
        | 'assign'
        | 'reviews'
        | 'other-work'
        | 'speed-ecom-reassign'
        | 'manager-monthly-rankings'
        | 'md-impex-strike'
        | 'md-impex-manual-strike'
        | 'md-impex-access'
        | 'personal-tasks'
        | 'assigned-by-me'
        | 'assigned-to-me'
        | 'headline'
    >('dashboard');
    const DASHBOARD_SPOTLIGHT_MANAGER_STORAGE_KEY = 'dashboard_spotlight_manager_selection';
    const [dashboardSpotlight, setDashboardSpotlight] = useState<'employee-of-month' | 'manager-monthly-ranking' | 'power-star-of-month'>('employee-of-month');

    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const roleIsAdminLike = useMemo(() => {
        const roleKey = String((currentUser as any)?.role || '').trim().toLowerCase();
        return ['admin', 'super_admin', 'manager', 'md_manager', 'ob_manager', 'all_manager', 'marketer_manager'].includes(roleKey);
    }, [currentUser]);

    const isManagerRole = useMemo(() => {
        return String((currentUser as any)?.role || '').trim().toLowerCase() === 'manager';
    }, [currentUser]);

    const dashboardSpotlightOverride = useMemo(() => {
        try {
            return getDashboardSpotlightOverrideForEmail((currentUser as any)?.email);
        } catch {
            return null;
        }
    }, [currentUser?.email]);

    useEffect(() => {
        if (dashboardSpotlightOverride) {
            // prefer explicit override for users who are listed in spotlight email lists
            setDashboardSpotlight(dashboardSpotlightOverride);
        }
    }, [dashboardSpotlightOverride]);

    useEffect(() => {
        if (!isManagerRole) return;
        if (dashboardSpotlightOverride) return;
        try {
            const raw = localStorage.getItem(DASHBOARD_SPOTLIGHT_MANAGER_STORAGE_KEY);
            const key = String(raw || '').trim();
            if (key === 'employee-of-month' || key === 'manager-monthly-ranking' || key === 'power-star-of-month') {
                setDashboardSpotlight(key);
            }
        } catch {
            // ignore
        }
    }, [DASHBOARD_SPOTLIGHT_MANAGER_STORAGE_KEY, dashboardSpotlightOverride, isManagerRole]);

    useEffect(() => {
        if (!isManagerRole) return;
        try {
            localStorage.setItem(DASHBOARD_SPOTLIGHT_MANAGER_STORAGE_KEY, dashboardSpotlight);
        } catch {
            // ignore
        }
    }, [DASHBOARD_SPOTLIGHT_MANAGER_STORAGE_KEY, dashboardSpotlight, isManagerRole]);

    const effectiveDashboardSpotlight = dashboardSpotlightOverride || (
        roleIsAdminLike ||
            ['assistant', 'sub_assistance', 'assistence', 'sub_assistence'].includes(String((currentUser as any)?.role || '').trim().toLowerCase())
            ? dashboardSpotlight
            : null
    );

    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const currentUserEmailRef = useRef<string>('');
    const socketRef = useRef<Socket | null>(null);
    const userMappingsFetchInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
    const userMappingsFetchedAtRef = useRef<Map<string, number>>(new Map());
    const USER_MAPPINGS_TTL_MS = 60_000;
    const BRANDS_AUTO_REFRESH_MS = 15_000;

    const fetchMyReminders = useCallback(async () => {
        try {
            const res = await apiClient.get('/reminders/my');
            const list = Array.isArray(res?.data?.data) ? (res.data.data as any[]) : [];
            const normalized: TaskReminderClientItem[] = list
                .map((r: any) => ({
                    id: String(r?.id || r?._id || '').trim(),
                    taskId: String(r?.taskId || '').trim(),
                    fromEmail: String(r?.fromEmail || '').trim(),
                    message: String(r?.message || '').trim(),
                    createdAt: r?.createdAt || null,
                    task: r?.task || {}
                }))
                .filter((r) => Boolean(r.id));
            setUnreadReminders(normalized);
            setActiveReminderId((prev) => {
                if (prev && normalized.some((x) => x.id === prev)) return prev;
                return normalized[0]?.id || '';
            });
        } catch {
            // ignore
        }
    }, []);

    const acknowledgeReminder = useCallback(async (reminderId: string) => {
        const id = String(reminderId || '').trim();
        if (!id) return;
        try {
            await apiClient.patch(`/reminders/${id}/seen`);
        } catch {
            // ignore
        }
        setUnreadReminders((prev) => prev.filter((r) => r.id !== id));
        setActiveReminderId((prev) => {
            if (prev !== id) return prev;
            const remaining = unreadReminders.filter((r) => r.id !== id);
            return remaining[0]?.id || '';
        });
    }, [unreadReminders]);

    const activeReminder = useMemo(() => {
        const id = String(activeReminderId || '').trim();
        if (!id) return null;
        return (unreadReminders || []).find((r) => r.id === id) || null;
    }, [activeReminderId, unreadReminders]);

    useEffect(() => {
        let mounted = true;
        const fetchReviewedForSummary = async () => {
            try {
                const res = await taskService.getTaskReviews({ reviewed: true });
                if (!mounted) return;
                if (res && (res as any).success) {
                    setReviewedTasksForSummary((res as any).data || []);
                }
            } catch {
                return;
            }
        };
        void fetchReviewedForSummary();
        return () => {
            mounted = false;
        };
    }, []);



    const reviewModalTask = useMemo(() => {
        if (!reviewModalTaskId) return null;
        return (pendingManagerReviewTasks || []).find((t: any) => String((t as any)?.id || (t as any)?._id || '') === reviewModalTaskId) || null;
    }, [pendingManagerReviewTasks, reviewModalTaskId]);

    useEffect(() => {
        const next = pendingManagerReviewTasks || [];
        if (next.length === 0) {
            setReviewModalTaskId(null);
            return;
        }
        setReviewModalTaskId((prev) => {
            if (prev && next.some((t: any) => String((t as any)?.id || (t as any)?._id || '') === prev)) return prev;
            return String((next[0] as any)?.id || (next[0] as any)?._id || '');
        });
    }, [pendingManagerReviewTasks]);

    useEffect(() => {
        if (!reviewModalTaskId) return;
        setReviewModalStars(0);
        setReviewModalComment('');
    }, [reviewModalTaskId]);

    useEffect(() => {
        const next = pendingManagerReviewTasks || [];
        if (next.length === 0) return;
        next.forEach((t: any) => {
            const id = String((t as any)?.id || (t as any)?._id || '').trim();
            if (!id) return;
            if (notifiedReviewTaskIdsRef.current.has(id)) return;
            notifiedReviewTaskIdsRef.current.add(id);
            const assigneeName = String((t as any)?.assignedToUser?.name || '').trim();
            const title = String((t as any)?.title || 'Task').trim();
            toast.success(`Task completed${assigneeName ? ` by ${assigneeName}` : ''}: ${title}. Review required.`);
        });
    }, [pendingManagerReviewTasks]);

    const submitReviewFromModal = useCallback(async () => {
        if (!reviewModalTaskId) return;
        if (reviewModalSubmitting) return;
        setReviewModalSubmitting(true);
        try {
            const res = await taskService.submitTaskReview(reviewModalTaskId, {
                reviewStars: reviewModalStars,
                reviewComment: reviewModalComment,
            });
            if (res.success && res.data) {
                dispatch(taskUpserted(res.data as Task));
                toast.success(res.message || 'Review saved successfully');
            } else {
                toast.error(res.message || 'Failed to save review');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save review');
        } finally {
            setReviewModalSubmitting(false);
        }
    }, [dispatch, reviewModalComment, reviewModalStars, reviewModalSubmitting, reviewModalTaskId]);

    useEffect(() => {
        usersRef.current = users;
    }, [users]);

    useEffect(() => {
        currentUserEmailRef.current = (currentUser?.email || '').toString();
    }, [currentUser?.email]);

    useEffect(() => {
        const email = (currentUser?.email || '').toString().trim().toLowerCase();
        if (!email) return;
        // removed dispatch(tasksReset()); here so we don't clear prefetched tasks from LoginPage
        hasFetchedTasksOnceRef.current = false;
        seenTaskIdsRef.current = new Set();
        setLoading(tasks.length === 0);
        void dispatch(fetchTasksThunk({ force: true }))
            .finally(() => {
                setLoading(false);
            });
        void dispatch(fetchUsersThunk({ force: true }));
        void dispatch(fetchBrandsThunk({ force: true }));
    }, [currentUser?.email, dispatch]);

    useEffect(() => {
        if (!isAuthReady) return;
        const email = (currentUser?.email || '').toString().trim().toLowerCase();
        if (!email) return;
        const userId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        const companyName = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();
        const socketUrl = resolveSocketUrl();
        if (!socketUrl) return;
        void fetchMyReminders();
        try {
            socketRef.current?.disconnect();
        } catch {
            // ignore
        }
        const socket = io(socketUrl, {
            auth: {
                userId,
                role,
                companyName,
            },
        });
        socketRef.current = socket;
        socket.on('connect', () => {
            console.log('📡 [socket] Connected successfully. socketId:', socket.id);
        });
        socket.on('connect_error', (err) => {
            console.warn('📡 [socket] Connection error:', err.message);
        });
        socket.on('disconnect', (reason) => {
            console.warn('📡 [socket] Disconnected. Reason:', reason);
            // If the server forcibly disconnected, try to reconnect
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
        const normalizeIncomingTask = (task: any) => {
            if (!task) return task;
            const id = String(task?.id || task?._id || '').trim();
            return {
                ...task,
                id: id || task?.id,
                companyName: (task?.companyName || task?.company || '').toString(),
                taskType: (task?.taskType || task?.type || '').toString(),
                brand: (typeof task?.brand === 'string' ? task.brand : (task?.brand?.name || '')).toString(),
            };
        };
        const onUpserted = (payload: any) => {
            console.log('📡 [socket] Received task:upserted:', payload);
            try {
                const task = normalizeIncomingTask(payload?.task);
                console.log('📡 [socket] Normalized task:', task);
                if (!task?.id) {
                    console.warn('📡 [socket] No task ID found in payload, skipping update.');
                    return;
                }
                dispatch(taskUpserted(task as Task));
                try {
                    window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { task } }));
                } catch {
                    // ignore
                }
            } catch (err) {
                console.error('📡 [socket] Error handling task:upserted:', err);
                return;
            }
        };
        const normalizeIncomingBrand = (brand: any) => {
            if (!brand) return brand;
            const id = String(brand?.id || brand?._id || '').trim();
            return {
                ...brand,
                id: id || brand?.id,
                company: (brand?.company || brand?.companyName || '').toString(),
            };
        };
        const onBrandUpserted = (payload: any) => {
            try {
                const next = normalizeIncomingBrand(payload?.brand);
                const nextId = String((next as any)?.id || (next as any)?._id || '').trim();
                if (!nextId) return;
                dispatch(brandUpserted(next as Brand));
                brandsFetchedAtRef.current = Date.now();
                try {
                    window.dispatchEvent(new CustomEvent('brandUpdated', { detail: { brandId: nextId } }));
                } catch {
                    // ignore
                }
            } catch {
                return;
            }
        };
        const onBrandDeleted = (payload: any) => {
            try {
                const brandId = String(payload?.brandId || '').trim();
                if (!brandId) return;
                dispatch(brandRemoved(brandId));
                brandsFetchedAtRef.current = Date.now();
                try {
                    window.dispatchEvent(new CustomEvent('brandUpdated', { detail: { brandId } }));
                } catch {
                    // ignore
                }
            } catch {
                return;
            }
        };
        const normalizeIncomingUser = (user: any) => {
            if (!user) return user;
            const id = String(user?.id || user?._id || '').trim();
            return {
                ...user,
                id: id || user?.id,
                companyName: (user?.companyName || user?.company || '').toString(),
            };
        };
        const onUserUpserted = (payload: any) => {
            try {
                const next = normalizeIncomingUser(payload?.user);
                const nextId = String((next as any)?.id || (next as any)?._id || '').trim();
                if (!nextId) return;
                dispatch(userUpserted(next as UserType));
                usersFetchedAtRef.current = Date.now();
                try {
                    window.dispatchEvent(new CustomEvent('userUpdated', { detail: { userId: nextId } }));
                } catch {
                    // ignore
                }
            } catch {
                return;
            }
        };
        const onUserDeleted = (payload: any) => {
            try {
                const userIdToDelete = String(payload?.userId || '').trim();
                if (!userIdToDelete) return;
                dispatch(userRemoved(userIdToDelete));
                usersFetchedAtRef.current = Date.now();
                try {
                    window.dispatchEvent(new CustomEvent('userUpdated', { detail: { userId: userIdToDelete } }));
                } catch {
                    // ignore
                }
            } catch {
                return;
            }
        };
        const onAssignmentChanged = (payload: any) => {
            try {
                const companyName = String(payload?.companyName || '').trim();
                const affectedUserId = String(payload?.userId || '').trim();
                if (!companyName || !affectedUserId) return;
                window.dispatchEvent(new CustomEvent('assignmentsApplied', {
                    detail: {
                        companyName,
                        userId: affectedUserId,
                    }
                }));
            } catch {
                return;
            }
        };
        const unreadKey = `unread_comments:${userId}`;
        const readUnreadMap = (): Record<string, number> => {
            try {
                const raw = localStorage.getItem(unreadKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
                return {};
            }
        };
        const onReminderNew = (payload: any) => {
            try {
                const raw = payload?.reminder || payload;
                const id = String(raw?.id || raw?._id || '').trim();
                if (!id) return;
                const next: TaskReminderClientItem = {
                    id,
                    taskId: String(raw?.taskId || '').trim(),
                    fromEmail: String(raw?.fromEmail || '').trim(),
                    message: String(raw?.message || '').trim(),
                    createdAt: raw?.createdAt || null,
                    task: raw?.task || raw?.taskSnapshot || {},
                };
                setUnreadReminders((prev) => {
                    const list = Array.isArray(prev) ? prev : [];
                    const merged = [next, ...list.filter((x) => String(x?.id || '').trim() !== id)];
                    return merged;
                });
                setActiveReminderId((prev) => (prev ? prev : id));
            } catch {
                // ignore
            }
        };
        const writeUnreadMap = (map: Record<string, number>) => {
            try {
                localStorage.setItem(unreadKey, JSON.stringify(map || {}));
            } catch {
                // ignore
            }
        };
        const onCommentAdded = (payload: any) => {
            try {
                const taskId = String(payload?.taskId || '').trim();
                if (!taskId) return;
                const comment = payload?.comment;
                const actorId = String(comment?.userId || '').trim();
                const actorEmail = String(comment?.userEmail || '').trim().toLowerCase();
                if ((actorId && actorId === userId) || (actorEmail && actorEmail === email)) return;
                const map = readUnreadMap();
                map[taskId] = Date.now();
                writeUnreadMap(map);
                try {
                    window.dispatchEvent(new CustomEvent('taskCommentUnread', { detail: { taskId } }));
                } catch {
                    // ignore
                }
            } catch {
                return;
            }
        };
        socket.on('task:upserted', onUpserted);
        socket.on('brand:upserted', onBrandUpserted);
        socket.on('brand:deleted', onBrandDeleted);
        socket.on('user:upserted', onUserUpserted);
        socket.on('user:deleted', onUserDeleted);
        socket.on('assignment:upserted', onAssignmentChanged);
        socket.on('assignment:bulk-upserted', onAssignmentChanged);
        socket.on('comment:added', onCommentAdded);
        socket.on('reminder:new', onReminderNew);
        socket.on('user_online', (data: any) => {
            const uid = String(data?.userId || '').trim();
            if (uid) dispatch(userOnlineStatusChanged({ userId: uid, isOnline: true }));
        });
        socket.on('user_offline', (data: any) => {
            const uid = String(data?.userId || '').trim();
            if (uid) dispatch(userOnlineStatusChanged({ userId: uid, isOnline: false }));
        });
        return () => {
            try {
                socket.off('task:upserted', onUpserted);
                socket.off('brand:upserted', onBrandUpserted);
                socket.off('brand:deleted', onBrandDeleted);
                socket.off('user:upserted', onUserUpserted);
                socket.off('user:deleted', onUserDeleted);
                socket.off('assignment:upserted', onAssignmentChanged);
                socket.off('assignment:bulk-upserted', onAssignmentChanged);
                socket.off('comment:added', onCommentAdded);
                socket.off('reminder:new', onReminderNew);
                socket.off('user_online');
                socket.off('user_offline');
                socket.disconnect();
            } catch {
                // ignore
            }
        };
    }, [currentUser, dispatch, fetchMyReminders, isAuthReady]);

    const hasAccess = useCallback((moduleId: string) => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        if (moduleId === 'user_management') return role === 'super_admin' || role === 'admin';
        if (moduleId === 'access_management' && (role === 'am' || role === 'rm')) return false;
        if (role === 'super_admin' || role === 'admin') return true;
        if (['sbm', 'rm', 'am', 'ar', 'troubleshoot_manager'].includes(role) && moduleId === 'create_task') return true;
        if (role === 'troubleshoot_manager' && moduleId === 'strike_page') return true;
        if (!isAuthReady) return true;
        const perms = (currentUser as any)?.permissions;
        if (!perms || typeof perms !== 'object') return true;
        if (Object.keys(perms).length === 0) return true;
        if (typeof (perms as any)[moduleId] === 'undefined') return true;
        const perm = String((perms as any)[moduleId] || '').trim().toLowerCase();
        if (['deny', 'no', 'false', '0', 'disabled'].includes(perm)) return false;
        if (['allow', 'allowed', 'yes', 'true', '1'].includes(perm)) return true;
        return perm !== 'deny';
    }, [currentUser, isAuthReady]);

    const canViewAllTasks = useMemo(() => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        if (role === 'ob_manager') return true;
        return hasAccess('view_all_tasks');
    }, [currentUser, hasAccess]);

    const canCreateTasks = useMemo(() => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        if (role === 'ob_manager') return true;
        return hasAccess('create_task');
    }, [currentUser, hasAccess]);

    const canBulkAddTaskTypes = useMemo(() => hasAccess('task_type_bulk_add'), [hasAccess]);
    const canBulkAddCompanies = useMemo(() => hasAccess('company_bulk_add'), [hasAccess]);
    const canBulkAddBrands = useMemo(() => hasAccess('brand_bulk_add'), [hasAccess]);
    const canCreateBrand = useMemo(() => hasAccess('brand_create'), [hasAccess]);
    const isSbmRole = useMemo(() => {
        const r = String((currentUser as any)?.role || '').trim().toLowerCase();
        return r === 'sbm';
    }, [currentUser]);
    const isAdminLike = useMemo(() => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        return role === 'admin' || role === 'super_admin' || role === 'troubleshoot_manager';
    }, [currentUser]);

    const canSendReminderForTask = useCallback((task: Task): boolean => {
        if (isAdminLike) return true;
        const myEmail = String((currentUser as any)?.email || '').trim().toLowerCase();
        if (!myEmail) return false;
        const assignedByRaw = (task as any)?.assignedBy;
        const creatorEmail = String(
            (typeof assignedByRaw === 'string'
                ? assignedByRaw
                : assignedByRaw?.email || assignedByRaw?.userEmail || '') ||
            (task as any)?.assignedByUser?.email ||
            (task as any)?.createdBy?.email ||
            (task as any)?.createdByEmail ||
            ''
        )
            .trim()
            .toLowerCase();
        return Boolean(creatorEmail && creatorEmail === myEmail);
    }, [currentUser, isAdminLike]);

    const handleSendReminder = useCallback(async (task: Task) => {
        if (!canSendReminderForTask(task)) return;
        const taskId = String((task as any)?.id || (task as any)?._id || '').trim();
        if (!taskId) return;
        if (sendingReminderByTaskId[taskId]) return;
        setSendReminderTask(task);
        setSendReminderOpen(true);
    }, [canSendReminderForTask, sendingReminderByTaskId]);

    const closeSendReminderModal = useCallback(() => {
        setSendReminderOpen(false);
        setSendReminderTask(null);
    }, []);

    const submitSendReminder = useCallback(async (message: string) => {
        const taskId = String((sendReminderTask as any)?.id || (sendReminderTask as any)?._id || '').trim();
        if (!taskId) return;
        if (sendingReminderByTaskId[taskId]) return;
        setSendingReminderByTaskId((prev) => ({ ...prev, [taskId]: true }));
        try {
            const res = await apiClient.post('/reminders/send', { taskId, message });
            if (res?.data?.success) {
                toast.success(res?.data?.message || 'Reminder sent');
            } else {
                toast.error(res?.data?.message || 'Failed to send reminder');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to send reminder');
        } finally {
            setSendingReminderByTaskId((prev) => ({ ...prev, [taskId]: false }));
            closeSendReminderModal();
        }
    }, [closeSendReminderModal, sendReminderTask, sendingReminderByTaskId]);

    const [newTask, setNewTask] = useState<NewTaskForm>({
        title: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        taskType: '',
        companyName: '',
        brand: '',
    });

    const usersForAddTaskModal = useMemo(() => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        const normalizeCompany = (value: unknown): string => {
            return (value == null ? '' : String(value)).trim().toLowerCase();
        };
        const normalizeRole = (value: unknown): string => {
            return (value == null ? '' : String(value)).trim().toLowerCase().replace(/[\s-]+/g, '_');
        };
        const modalCompanyKey = normalizeCompany(newTask.companyName);
        const userCompanyKey = normalizeCompany((currentUser as any)?.companyName || (currentUser as any)?.company);
        const targetCompanyKey = (() => {
            if (role === 'admin' || role === 'super_admin') {
                return modalCompanyKey;
            }
            return modalCompanyKey || userCompanyKey;
        })();
        const filterByCompany = (list: UserType[] | undefined | null): UserType[] => {
            const source = list || [];
            if (!targetCompanyKey) {
                if (role === 'admin' || role === 'super_admin') return source;
                return source.filter((u: any) => normalizeCompany((u as any)?.companyName || (u as any)?.company) === userCompanyKey);
            }
            return source.filter((u: any) => {
                const cKey = normalizeCompany((u as any)?.companyName || (u as any)?.company);
                return cKey === targetCompanyKey;
            });
        };
        const toId = (u: any): string => {
            return String(u?.id || u?._id || '').trim();
        };
        const baseUsers = users || [];
        const adminUsersAnyCompany = baseUsers.filter((u: any) => {
            const r = normalizeRole((u as any)?.role);
            return r === 'admin' || r === 'super_admin';
        });
        const myEmailForAddTaskModal = String((currentUser as any)?.email || '').trim().toLowerCase();
        if (myEmailForAddTaskModal === 'nitishnilaya@gmail.com') {
            const allowedEmails = [
                'drashtismartbiz@gmail.com',
                'harshsmartbiz@gmail.com',
                'krunalsmartbiz@gmail.com',
                'nitishnilaya@gmail.com',
                'meetsmartbiz@gmail.com'
            ].map((e) => String(e).trim().toLowerCase());
            const allowedSet = new Set(allowedEmails);
            const allowedUsers = allowedEmails.map((email) => {
                const found = baseUsers.find((u: any) => String((u as any)?.email || '').trim().toLowerCase() === email);
                if (found) return found;
                return {
                    id: email,
                    name: email.split('@')[0] || 'User',
                    email,
                    role: 'user'
                } as any;
            });
            return Array.from(
                new Map(
                    allowedUsers
                        .filter((u: any) => allowedSet.has(String((u as any)?.email || '').trim().toLowerCase()))
                        .map((u: any) => [String((u as any)?.email || '').trim().toLowerCase(), u])
                ).values()
            );
        }
        const taskTypeKey = (newTask.taskType || '').toString().trim().toLowerCase();
        const isOtherWork = taskTypeKey === 'other work';
        if (role === 'md_manager') {
            const requesterId = toId(currentUser);
            const myEmail = String((currentUser as any)?.email || '').trim().toLowerCase();
            const selfUser = (baseUsers || []).find((u: any) => {
                const id = toId(u);
                const email = String((u as any)?.email || '').trim().toLowerCase();
                return (requesterId && id === requesterId) || (myEmail && email === myEmail);
            }) || (currentUser as any);
            const mdManagers = baseUsers.filter((u: any) => normalizeRole(u?.role) === 'md_manager');
            const managersAndObManagersAndAssistants = filterByCompany(baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'manager' || r === 'ob_manager' || r === 'assistant' || r === 'sub_assistance';
            }));
            const candidates = [...mdManagers, selfUser, ...managersAndObManagersAndAssistants];
            return Array.from(new Map(candidates.map((u: any) => [toId(u) || String(u?.email || ''), u])).values());
        }
        if (role === 'manager' || role === 'marketer_manager') {
            const byRole = baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'manager' || r === 'ob_manager' || r === 'assistant' || r === 'sub_assistance';
            });
            const scoped = filterByCompany(byRole);
            if (!isOtherWork) return scoped;
            const targetEmail = 'keyurismartbiz@gmail.com';
            const keyuri = baseUsers.find((u: any) => String((u as any)?.email || '').trim().toLowerCase() === targetEmail);
            const keyuriUser = keyuri || ({
                id: targetEmail,
                name: targetEmail.split('@')[0] || 'User',
                email: targetEmail,
                role: 'manager'
            } as any);
            const assistantsAnyCompany = baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'assistant' || r === 'sub_assistance'
            });
            const merged = [...(scoped || []), ...(assistantsAnyCompany || []), keyuriUser]
                .filter((u: any) => Boolean(String((u as any)?.email || '').trim()));
            return Array.from(new Map(merged.map((u: any) => [String((u as any)?.email || '').trim().toLowerCase(), u])).values());
        }
        if (role === 'ob_manager') {
            const byRole = baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'manager' || r === 'md_manager' || r === 'ob_manager' || r === 'assistant' || r === 'sub_assistance';
            });
            return filterByCompany(byRole);
        }
        if (role === 'sbm' || role === 'rm' || role === 'am' || role === 'ar') {
            const requesterId = toId(currentUser);
            const requesterManagerId = String((currentUser as any)?.managerId || '').trim();
            const adminUsers = baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'admin' || r === 'super_admin';
            });
            if (role === 'rm') {
                const selfUser = (baseUsers || []).find((u: any) => {
                    const id = toId(u);
                    const email = String((u as any)?.email || '').trim().toLowerCase();
                    const myEmail = String((currentUser as any)?.email || '').trim().toLowerCase();
                    return (requesterId && id === requesterId) || (myEmail && email === myEmail);
                }) || (currentUser as any);
                const amUsers = baseUsers.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    const mid = String((u as any)?.managerId || '').trim();
                    return r === 'am' && requesterId && mid === requesterId;
                });
                const sbmUser = baseUsers.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    return r === 'sbm' && requesterManagerId && toId(u) === requesterManagerId;
                });
                const candidates = [...adminUsers, selfUser, ...amUsers, ...sbmUser];
                const visible = candidates.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    if (r === 'admin' || r === 'super_admin') return true;
                    return filterByCompany([u]).length > 0;
                });
                return Array.from(new Map(visible.map((u: any) => [toId(u) || String(u?.email || ''), u])).values());
            }
            if (role === 'am') {
                const selfUser = (baseUsers || []).find((u: any) => {
                    const id = toId(u);
                    const email = String((u as any)?.email || '').trim().toLowerCase();
                    const myEmail = String((currentUser as any)?.email || '').trim().toLowerCase();
                    return (requesterId && id === requesterId) || (myEmail && email === myEmail);
                }) || (currentUser as any);
                const rmUser = baseUsers.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    return r === 'rm' && requesterManagerId && toId(u) === requesterManagerId;
                });
                const rm = rmUser.length > 0 ? rmUser[0] : null;
                const sbmId = rm ? String((rm as any)?.managerId || '').trim() : '';
                const sbmUser = baseUsers.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    return r === 'sbm' && sbmId && toId(u) === sbmId;
                });
                const candidates = [...adminUsers, selfUser, ...rmUser, ...sbmUser];
                const visible = candidates.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    if (r === 'admin' || r === 'super_admin') return true;
                    return filterByCompany([u]).length > 0;
                });
                return Array.from(new Map(visible.map((u: any) => [toId(u) || String(u?.email || ''), u])).values());
            }
            if (role === 'sbm') {
                const adminUsers = baseUsers.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    return r === 'admin' || r === 'super_admin';
                });
                const byRole = baseUsers.filter((u: any) => {
                    const r = normalizeRole(u?.role);
                    return r === 'sbm' || r === 'rm' || r === 'am' || r === 'sales_manager';
                });
                const scoped = filterByCompany(byRole);
                const merged = [...adminUsers, ...scoped];
                return Array.from(new Map(merged.map((u: any) => [toId(u) || String((u as any)?.email || ''), u])).values());
            }
            const byRole = baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'sbm' || r === 'rm' || r === 'am';
            });
            return filterByCompany(byRole);
        }
        if (role === 'sales_manager' || role === 'sales_man') {
            const adminUsers = baseUsers.filter((u: any) => {
                const r = normalizeRole(u?.role);
                return r === 'admin' || r === 'super_admin';
            });
            const sbmUsers = role === 'sales_manager'
                ? baseUsers.filter((u: any) => normalizeRole(u?.role) === 'sbm')
                : [];
            const scoped = filterByCompany(baseUsers);
            const merged = [...adminUsers, ...sbmUsers, ...scoped];
            return Array.from(new Map(merged.map((u: any) => [String((u as any)?.email || '').trim().toLowerCase(), u])).values());
        }
        if (role === 'admin' || role === 'super_admin') {
            return filterByCompany(baseUsers);
        }
        const scoped = filterByCompany(baseUsers);
        const merged = [...adminUsersAnyCompany, ...scoped];
        return Array.from(new Map(merged.map((u: any) => [toId(u) || String((u as any)?.email || ''), u])).values());
    }, [currentUser, newTask.companyName, users]);

    const handleLogout = useCallback(() => {
        try {
            const accessToken = sessionStorage.getItem('tms_google_calendar_access_token');
            const google = (window as any).google;
            if (accessToken && google?.accounts?.oauth2?.revoke) {
                google.accounts.oauth2.revoke(accessToken, () => { });
            }
        } catch {
            // ignore
        }
        try {
            localStorage.removeItem('tms_google_calendar_connected');
            sessionStorage.removeItem('tms_google_calendar_access_token');
        } catch {
            // ignore
        }
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        navigate('/login');
    }, [navigate]);

    const [editFormData, setEditFormData] = useState<EditTaskForm>({
        id: '',
        title: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        taskType: '',
        companyName: '',
        brand: '',
        status: 'pending'
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
    const [bulkBrandForm, setBulkBrandForm] = useState<{
        company: string;
        brandNames: string;
        groupNumber?: string;
        groupName?: string;
        rmEmail?: string;
        amEmail?: string;
    }>({ company: '', brandNames: '' });
    const [isCreatingBulkBrands, setIsCreatingBulkBrands] = useState(false);
    const [showBulkCompanyModal, setShowBulkCompanyModal] = useState(false);
    const [bulkCompanyNames, setBulkCompanyNames] = useState('');
    const [isCreatingBulkCompanies, setIsCreatingBulkCompanies] = useState(false);
    const [showBulkTaskTypeModal, setShowBulkTaskTypeModal] = useState(false);
    const [bulkTaskTypeNames, setBulkTaskTypeNames] = useState('');
    const [bulkTaskTypeCompany, setBulkTaskTypeCompany] = useState('');
    const [isCreatingBulkTaskTypes, setIsCreatingBulkTaskTypes] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
    const [companyUsers, setCompanyUsers] = useState<any[]>([]);

    const loadUsersForCompany = useCallback(async (companyName: string) => {
        const company = (companyName || '').toString().trim();
        if (!company) {
            setCompanyUsers([]);
            return;
        }
        try {
            const res = await assignService.getCompanyUsers({ companyName: company });
            if (res?.success && Array.isArray(res.data)) setCompanyUsers(res.data as any);
            else setCompanyUsers([]);
        } catch {
            setCompanyUsers([]);
        }
    }, []);

    useEffect(() => {
        if (!showBulkBrandModal) return;
        const company = (bulkBrandForm.company || '').toString().trim();
        if (!company) return;
        void loadUsersForCompany(company);
    }, [bulkBrandForm.company, loadUsersForCompany, showBulkBrandModal]);

    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        priority: 'all',
        assigned: 'all',
        date: 'all',
        taskType: 'all',
        company: 'all',
        brand: 'all',
        rm: 'all',
        sort: 'desc',
    });
    const [taskTypeIdsByBrandId, setTaskTypeIdsByBrandId] = useState<Record<string, string[]>>({});
    const [taskTypeIdsByCompanyUserBrandKey, setTaskTypeIdsByCompanyUserBrandKey] = useState<Record<string, string[]>>({});
    const [brandNamesByCompanyUserKey, setBrandNamesByCompanyUserKey] = useState<Record<string, string[]>>({});

    const mainContentClasses = useMemo(() => {
        return `
            flex-1 flex flex-col
            transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'lg:ml-17' : 'lg:ml-56'}
            min-w-0
        `;
    }, [isSidebarCollapsed]);

    const dashboardContainerClasses = useMemo(() => {
        return `
            w-full max-w-full mx-auto px-0 sm:px-6 md:px-8
            transition-all duration-300 ease-in-out
        `;
    }, []);

    const brands = useMemo(() => {
        return [...apiBrands];
    }, [apiBrands]);

    const normalizeText = useCallback((value: unknown): string => {
        return (value == null ? '' : String(value)).trim().toLowerCase();
    }, []);

    const normalizeRoleKey = useCallback((value: unknown): string => {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
    }, []);

    const normalizeCompanyKey = useCallback((value: unknown): string => {
        return normalizeText(value).replace(/\s+/g, '');
    }, [normalizeText]);

    // Optimized brand lookup map for fast brand resolution
    const brandLookupMap = useMemo(() => {
        const map = new Map<string, any>();
        brands.forEach((brand: any) => {
            const brandId = String(brand?.id || brand?._id || '').trim();
            if (brandId) {
                map.set(brandId, brand);
            }
            // Also index by company+name for fallback lookup
            const companyKey = normalizeCompanyKey(getBrandCompanyNameSafe(brand));
            const nameKey = normalizeText(getBrandNameSafe(brand));
            if (companyKey && nameKey) {
                const compoundKey = `${companyKey}::${nameKey}`;
                map.set(compoundKey, brand);
            }
        });

        // Also include brandDetails from tasks for immediate availability
        tasks.forEach((task: any) => {
            const brandDetails = task?.brandDetails;
            if (brandDetails) {
                const brandId = String(brandDetails.id || '').trim();
                if (brandId) {
                    map.set(brandId, brandDetails);
                }
                // Also index by company+name
                const companyKey = normalizeCompanyKey(brandDetails.company || task?.companyName || task?.company);
                const nameKey = normalizeText(brandDetails.name);
                if (companyKey && nameKey) {
                    const compoundKey = `${companyKey}::${nameKey}`;
                    map.set(compoundKey, brandDetails);
                }
            }
        });

        return map;
    }, [brands, tasks, normalizeCompanyKey, getBrandCompanyNameSafe, getBrandNameSafe, normalizeText]);

    const SPEED_E_COM_COMPANY_NAME = 'Speed E Com';
    const SPEED_E_COM_COMPANY_KEY = 'speedecom';
    const SPEED_E_COM_FIXED_TASK_TYPES = ['Meeting Pending', 'CP Pending', 'Recharge Negative'];

    const isSpeedEcomUser = useMemo(() => {
        const key = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company);
        return key === SPEED_E_COM_COMPANY_KEY;
    }, [currentUser, normalizeCompanyKey]);

    const isSpeedEcomTask = useCallback((task: any): boolean => {
        const companyKey = normalizeCompanyKey(task?.companyName || task?.company);
        return companyKey === SPEED_E_COM_COMPANY_KEY;
    }, [normalizeCompanyKey]);

    const getTaskAssigneeEmail = useCallback((task: any): string => {
        const assignedTo = (task as any)?.assignedTo;
        const assignedToUser = (task as any)?.assignedToUser;
        const email =
            (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
            (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
            (typeof assignedTo === 'string' ? assignedTo : '') ||
            '';
        return stripDeletedEmailSuffix(email).trim().toLowerCase();
    }, []);

    const restrictTaskTypesForCompany = useCallback((companyName: unknown, list: string[]): string[] => {
        const companyKey = normalizeCompanyKey(companyName);
        if (companyKey === SPEED_E_COM_COMPANY_KEY) {
            const safe = Array.isArray(list) ? list.filter(Boolean) : [];
            return Array.from(new Set([...safe, ...SPEED_E_COM_FIXED_TASK_TYPES]));
        }
        const currentUserCompanyKey = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company);
        if (!companyKey && currentUserCompanyKey === SPEED_E_COM_COMPANY_KEY) {
            const safe = Array.isArray(list) ? list.filter(Boolean) : [];
            return safe.length > 0 ? safe : [...SPEED_E_COM_FIXED_TASK_TYPES];
        }
        if (companyKey === 'all' && currentUserCompanyKey === SPEED_E_COM_COMPANY_KEY) {
            const safe = Array.isArray(list) ? list.filter(Boolean) : [];
            return safe.length > 0 ? safe : [...SPEED_E_COM_FIXED_TASK_TYPES];
        }
        return list;
    }, [currentUser, normalizeCompanyKey]);

    const [taskTypeCompanyOverrides, setTaskTypeCompanyOverrides] = useState<Record<string, string[]>>({});

    const loadCompanyTaskTypeOverrides = useCallback(async () => {
        try {
            const res = await companyTaskTypeService.getAllCompanyTaskTypes();
            if (res?.success && Array.isArray(res.data)) {
                const next: Record<string, string[]> = {};
                (res.data || []).forEach((row: any) => {
                    const key = normalizeText(row?.companyName);
                    if (!key) return;
                    const names = (row?.taskTypes || [])
                        .map((t: any) => (t?.name || '').toString().trim())
                        .filter(Boolean);
                    if (names.length > 0) next[key] = names;
                });
                setTaskTypeCompanyOverrides(next);
            } else {
                setTaskTypeCompanyOverrides({});
            }
        } catch {
            setTaskTypeCompanyOverrides({});
        }
    }, [normalizeText]);

    useEffect(() => {
        void loadCompanyTaskTypeOverrides();
    }, [loadCompanyTaskTypeOverrides]);

    const addTaskTypesToCompany = useCallback(async (companyName: string, typeNames: string[]) => {
        const companyKey = normalizeText(companyName);
        if (!companyKey) return;
        const cleaned = (typeNames || []).map((t) => (t || '').toString().trim()).filter(Boolean);
        if (cleaned.length === 0) return;
        try {
            const res = await companyTaskTypeService.upsertCompanyTaskTypes({
                companyName,
                taskTypeNames: cleaned,
            });
            if (res?.success && res.data) {
                setTaskTypeCompanyOverrides((prev) => {
                    const current = prev || {};
                    const next = { ...current };
                    const key = normalizeText(res.data.companyName || companyName);
                    const names = (res.data.taskTypes || [])
                        .map((t: any) => (t?.name || '').toString().trim())
                        .filter(Boolean);
                    next[key] = names;
                    return next;
                });
                return;
            }
            setTaskTypeCompanyOverrides((prev) => {
                const current = prev || {};
                const existing = Array.isArray(current[companyKey]) ? current[companyKey] : [];
                const merged = Array.from(new Set([...existing, ...cleaned]));
                return { ...current, [companyKey]: merged };
            });
        } catch {
            toast.error('Failed to save task types for company');
        }
    }, [normalizeText]);

    const availableCompanies = useMemo(() => {
        const resolveFromCompanyList = (raw: string) => {
            const input = (raw || '').toString().trim();
            if (!input) return '';
            const key = input.replace(/\s+/g, '').toLowerCase();
            const match = (companies || []).find((c: any) => {
                const name = String(c?.name || '').trim();
                if (!name) return false;
                return name.replace(/\s+/g, '').toLowerCase() === key;
            });
            return (match?.name || input).toString().trim();
        };
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role === 'md_manager' || role === 'ob_manager') {
            const fromCompanies = (companies || []).map(c => (c?.name || '').toString().trim()).filter(Boolean);
            return [...new Set(fromCompanies)].filter(Boolean).sort();
        }
        if (role === 'manager' || role === 'marketer_manager' || role === 'assistant') {
            const onlyRaw = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
            const only = resolveFromCompanyList(onlyRaw);
            if (only) return [only];
            return [MD_IMPEX_COMPANY_NAME];
        }
        if (role === 'sbm') {
            const fromCompanies = (companies || []).map(c => (c?.name || '').toString().trim()).filter(Boolean);
            if (fromCompanies.length > 0) {
                return [...new Set(fromCompanies)].filter(Boolean).sort();
            }
            const onlyRaw = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
            const only = resolveFromCompanyList(onlyRaw);
            if (only) return [only];
            return [SPEED_E_COM_COMPANY_NAME];
        }
        if (role === 'rm' || role === 'am' || role === 'ar') {
            const onlyRaw = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
            const name = resolveFromCompanyList(onlyRaw);
            if (name) return [name];
            return [SPEED_E_COM_COMPANY_NAME];
        }
        const allowedRoles = [
            'admin',
            'super_admin',
            'sbm',
            'rm',
            'am',
            'ar',
            'sales_manager',
            'sales_man'
        ];
        const needsCompanyList = allowedRoles.includes(role);
        const fromCompanies = (companies || []).map(c => (c?.name || '').toString().trim()).filter(Boolean);
        if (needsCompanyList && fromCompanies.length > 0) {
            return [...new Set(fromCompanies)].sort();
        }
        if (!needsCompanyList) {
            const fromAllowedBrands = (brands || [])
                .map(b => getBrandCompanyNameSafe(b))
                .filter(Boolean);
            return [...new Set(fromAllowedBrands)].sort();
        }
        const uniqueCompanies = [...new Set(brands.map((brand: any) => getBrandCompanyNameSafe(brand)))];
        return uniqueCompanies.filter(Boolean).sort();
    }, [
        MD_IMPEX_COMPANY_NAME,
        SPEED_E_COM_COMPANY_NAME,
        brands,
        companies,
        currentUser?.role,
        (currentUser as any)?.company,
        (currentUser as any)?.companyName
    ]);

    const availableRmUsersForFilters = useMemo(() => {
        const roleKey = normalizeRoleKey(currentUser?.role);
        if (roleKey !== 'sbm') return [] as Array<{ id: string; name: string; email: string }>;
        const selectedCompanyKey = normalizeCompanyKey(filters.company);
        const fallbackCompanyKey = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company);
        const companyKeyForRms = selectedCompanyKey && selectedCompanyKey !== 'all' ? selectedCompanyKey : fallbackCompanyKey;
        const list: any[] = Array.isArray(usersRef.current) ? (usersRef.current as any[]) : (users as any[]);
        const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        const allRms = (list || [])
            .filter((u: any) => normalizeRole(u?.role) === 'rm')
            .map((u: any) => ({
                id: String(u?.id || u?._id || u?.email || '').trim(),
                name: String(u?.name || u?.fullName || u?.email || '').trim(),
                email: String(u?.email || '').trim(),
                companyKey: normalizeCompanyKey(u?.companyName || u?.company),
            }))
            .filter((u: any) => Boolean(u?.email));
        const companyMatched = companyKeyForRms
            ? allRms.filter((u: any) => Boolean(u?.companyKey) && u.companyKey === companyKeyForRms)
            : [];
        const source = companyMatched.length > 0 ? companyMatched : allRms;
        return source
            .map(({ id, name, email }: any) => ({ id, name, email }))
            .sort((a: any, b: any) => String(a?.name || a?.email || '').localeCompare(String(b?.name || b?.email || '')));
    }, [currentUser, filters.company, normalizeCompanyKey, normalizeRoleKey, users, usersRef, filters]);

    const availableCompaniesForSbm = useMemo(() => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        if (role === 'troubleshoot_manager') {
            const match = (availableCompanies || []).find((c) => String(c || '').trim().toLowerCase() === 'md impex');
            if (match) return [match];
            return [MD_IMPEX_COMPANY_NAME];
        }
        if (!isSbmRole && role !== 'sales_manager' && role !== 'sales_man') return availableCompanies;
        const onlyRaw = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
        const onlyKey = onlyRaw.replace(/\s+/g, '').toLowerCase();
        const match = (availableCompanies || []).find((c) => String(c || '').trim().replace(/\s+/g, '').toLowerCase() === onlyKey);
        if (match) return [match];
        if (onlyRaw) return [onlyRaw];
        return (availableCompanies || []).slice(0, 1);
    }, [availableCompanies, currentUser, isSbmRole]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role !== 'md_manager' && role !== 'ob_manager' && role !== 'manager' && role !== 'assistant') return;
        const fromList = (role === 'md_manager' || role === 'ob_manager')
            ? ((availableCompanies[0] || '').toString().trim())
            : '';
        const resolvedCompany = fromList || ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
        const defaultCompany = resolvedCompany || MD_IMPEX_COMPANY_NAME;
        const allowedSet = new Set((availableCompanies || []).map((c) => (c || '').toString().trim()));
        setNewTask((prev) => {
            const current = (prev?.companyName || '').toString().trim();
            if (current && (allowedSet.size === 0 || allowedSet.has(current))) {
                return prev;
            }
            return { ...prev, companyName: defaultCompany };
        });
    }, [MD_IMPEX_COMPANY_NAME, availableCompanies, (currentUser as any)?.company, (currentUser as any)?.companyName, currentUser?.role]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role !== 'rm' && role !== 'am' && role !== 'ar') return;
        const rawCompany = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
        const rawKey = rawCompany.replace(/\s+/g, '').toLowerCase();
        const match = (companies || []).find((c: any) => {
            const name = String(c?.name || '').trim();
            if (!name) return false;
            return name.replace(/\s+/g, '').toLowerCase() === rawKey;
        });
        const resolvedCompany = (match?.name || rawCompany).toString().trim();
        const defaultCompany = resolvedCompany || SPEED_E_COM_COMPANY_NAME;
        const allowedSet = new Set((availableCompanies || []).map((c) => (c || '').toString().trim()));
        setNewTask((prev) => {
            const current = (prev?.companyName || '').toString().trim();
            if (current && (allowedSet.size === 0 || allowedSet.has(current))) {
                return prev;
            }
            return { ...prev, companyName: defaultCompany };
        });
    }, [SPEED_E_COM_COMPANY_NAME, availableCompanies, companies, (currentUser as any)?.company, (currentUser as any)?.companyName, currentUser?.role]);

    useEffect(() => {
        if (!showBulkBrandModal) return;
        setBulkBrandForm((prev) => {
            const current = (prev?.company || '').toString().trim();
            if (current) return prev;
            return { ...prev, company: MD_IMPEX_COMPANY_NAME };
        });
    }, [MD_IMPEX_COMPANY_NAME, showBulkBrandModal]);

    useEffect(() => {
        if (!showBulkTaskTypeModal) return;
        setBulkTaskTypeCompany((prev) => {
            const current = (prev || '').toString().trim();
            if (current) return prev;
            return MD_IMPEX_COMPANY_NAME;
        });
    }, [MD_IMPEX_COMPANY_NAME, showBulkTaskTypeModal]);

    const allowedTaskTypeKeysForManager = useMemo(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role !== 'manager') return new Set<string>();
        const myEmail = (currentUser?.email || '').toString().trim().toLowerCase();
        const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString().trim();
        const normalizeKey = (v: unknown) => (v || '').toString().trim().toLowerCase();
        const collectFrom = (value: any, out: string[]) => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach((item) => {
                    if (!item) return;
                    if (typeof item === 'string') {
                        out.push(item);
                        return;
                    }
                    if (typeof item === 'object') {
                        const raw =
                            (item as any)?.name ??
                            (item as any)?.label ??
                            (item as any)?.taskType ??
                            (item as any)?.type ??
                            (item as any)?.key;
                        const str = (raw || '').toString().trim();
                        if (str) out.push(str);
                    }
                });
                return;
            }
            if (typeof value === 'string') {
                value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach((s) => out.push(s));
                return;
            }
            if (typeof value === 'object') {
                Object.values(value).forEach((v) => collectFrom(v, out));
            }
        };
        const directValues: string[] = [];
        [
            (currentUser as any)?.assignedTaskTypes,
            (currentUser as any)?.assignedTaskTypeNames,
            (currentUser as any)?.assignedTaskTypeKeys,
            (currentUser as any)?.allowedTaskTypes,
            (currentUser as any)?.taskTypes,
            (currentUser as any)?.taskTypeKeys,
            (currentUser as any)?.taskTypeAssignments,
            (currentUser as any)?.taskTypeAccess,
        ].forEach((v) => collectFrom(v, directValues));
        const directKeys = new Set(directValues.map(normalizeKey).filter(Boolean));
        if (directKeys.size > 0) return directKeys;
        const resolveUserRole = (candidate: any): string => {
            const raw = (candidate || '').toString().trim();
            if (!raw) return '';
            const found = (users || []).find((u: any) => {
                const id = (u?.id || u?._id || '').toString();
                const email = (u?.email || '').toString();
                return id === raw || email.toLowerCase() === raw.toLowerCase();
            });
            return (found?.role || '').toString().trim().toLowerCase();
        };
        const getAssignerRole = (t: any): string => {
            const assignedByUser = t?.assignedByUser;
            const assignedBy = t?.assignedBy;
            const direct = (assignedByUser?.role || assignedBy?.role || '').toString().trim().toLowerCase();
            if (direct) return direct;
            const rawIdOrEmail =
                (typeof assignedBy === 'string' ? assignedBy : assignedBy?._id || assignedBy?.id || assignedBy?.email) ||
                (typeof assignedByUser === 'string' ? assignedByUser : assignedByUser?._id || assignedByUser?.id || assignedByUser?.email) ||
                '';
            return resolveUserRole(rawIdOrEmail);
        };
        const isAssignedToMe = (t: any) => {
            const assignedTo = t?.assignedTo;
            const assignedToUser = t?.assignedToUser;
            const assignedToId =
                (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
                (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
                '';
            const assignedToEmail =
                (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
                (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
                '';
            if (myId && assignedToId && assignedToId.toString().trim() === myId) return true;
            if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
            return false;
        };
        const allowed = new Set<string>();
        (tasks || []).forEach((t: any) => {
            if (!isAssignedToMe(t)) return;
            const assignerRole = getAssignerRole(t);
            if (assignerRole !== 'md_manager' && assignerRole !== 'ob_manager') return;
            const key = normalizeKey(t?.taskType || t?.type || '');
            if (key) allowed.add(key);
        });
        if (allowed.size === 0) {
            return new Set<string>(['other work', 'troubleshoot']);
        }
        return allowed;
    }, [currentUser, tasks, users]);

    const availableTaskTypes = useMemo(() => {
        const normalizeLabel = (v: unknown) => (v || '').toString().trim();
        const normalizeKey = (v: unknown) => normalizeLabel(v).toLowerCase();
        const canonicalizeLabel = (v: unknown) => {
            const raw = normalizeLabel(v);
            if (!raw) return '';
            const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
            if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') return 'Troubleshoot';
            return raw;
        };
        const apiLabels = (taskTypes || [])
            .map(t => canonicalizeLabel(t?.name))
            .filter(Boolean);
        const apiLabelByKey = new Map<string, string>();
        apiLabels.forEach(label => {
            const key = normalizeKey(label);
            if (!key) return;
            if (!apiLabelByKey.has(key)) apiLabelByKey.set(key, label);
        });
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role === 'assistant' || role === 'md_manager' || role === 'ob_manager') {
            const myEmail = (currentUser?.email || '').toString().trim().toLowerCase();
            const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString().trim();
            const isMine = (t: any) => {
                if (role === 'md_manager' || role === 'ob_manager') {
                    const assignedTo = t?.assignedTo;
                    const assignedToUser = t?.assignedToUser;
                    const assignedBy = t?.assignedBy;
                    const assignedByUser = t?.assignedByUser;
                    const assignedToId =
                        (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
                        (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
                        '';
                    const assignedToEmail =
                        (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
                        (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
                        '';
                    const assignedById =
                        (typeof assignedBy === 'string' ? assignedBy : assignedBy?._id || assignedBy?.id) ||
                        (typeof assignedByUser === 'string' ? assignedByUser : assignedByUser?._id || assignedByUser?.id) ||
                        '';
                    const assignedByEmail =
                        (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
                        (typeof assignedByUser === 'string' && assignedByUser.includes('@') ? assignedByUser : assignedByUser?.email) ||
                        '';
                    if (myId && assignedToId && assignedToId.toString().trim() === myId) return true;
                    if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
                    if (myId && assignedById && assignedById.toString().trim() === myId) return true;
                    if (myEmail && assignedByEmail && assignedByEmail.toString().trim().toLowerCase() === myEmail) return true;
                    return false;
                }
                const assignedTo = t?.assignedTo;
                const assignedToUser = t?.assignedToUser;
                const assignedToId =
                    (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
                    (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
                    '';
                const assignedToEmail =
                    (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
                    (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
                    '';
                if (myId && assignedToId && assignedToId.toString().trim() === myId) return true;
                if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
                return false;
            };
            const taskLabelByKey = new Map<string, string>();
            (tasks || []).forEach((t: any) => {
                if (!isMine(t)) return;
                const label = normalizeLabel(t?.taskType || t?.type || '');
                const key = normalizeKey(label);
                if (!key) return;
                if (!taskLabelByKey.has(key)) taskLabelByKey.set(key, label);
            });
            const mergedLabelByKey = new Map<string, string>(apiLabelByKey);
            taskLabelByKey.forEach((label, key) => {
                if (!mergedLabelByKey.has(key)) mergedLabelByKey.set(key, label);
            });
            const labels = Array.from(mergedLabelByKey.values()).filter(Boolean);
            return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
        }
        if (role === 'manager' || role === 'marketer_manager') {
            const managerDefaultTypeLabels = ['Other Work', 'Troubleshoot'];
            const allowedKeys = new Set<string>(managerDefaultTypeLabels.map(t => t.toLowerCase()));
            const mergedLabelByKey = new Map<string, string>();
            apiLabelByKey.forEach((label, key) => {
                if (allowedKeys.has(key)) mergedLabelByKey.set(key, label);
            });
            (tasks || []).forEach((t: any) => {
                const label = normalizeLabel(t?.taskType || t?.type || '');
                const key = normalizeKey(label);
                if (!key) return;
                if (!allowedKeys.has(key)) return;
                if (!mergedLabelByKey.has(key)) mergedLabelByKey.set(key, label);
            });
            const labels = Array.from(mergedLabelByKey.values()).filter(Boolean);
            return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
        }
        return [...new Set(apiLabels)].sort((a, b) => a.localeCompare(b));
    }, [allowedTaskTypeKeysForManager, currentUser, taskTypes, tasks]);

    const effectiveAvailableTaskTypes = useMemo(() => {
        const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
        const isMdImpexUser = currentUserCompany.includes('mdimpex') || currentUserCompany.includes('md_impex');
        if (isMdImpexUser && mdAllowedTaskTypes && mdAllowedTaskTypes.length > 0) return mdAllowedTaskTypes;
        return availableTaskTypes || [];
    }, [currentUser, mdAllowedTaskTypes, availableTaskTypes]);

    const taskTypesByCompanyFromTasks = useMemo(() => {
        const map = new Map<string, Set<string>>();
        (tasks || []).forEach((t: any) => {
            const company = normalizeText(t?.companyName || t?.company);
            const type = (t?.taskType || t?.type || '').toString().trim();
            if (!company || !type) return;
            if (!map.has(company)) map.set(company, new Set<string>());
            map.get(company)!.add(type);
        });
        return map;
    }, [tasks, normalizeText]);

    const getTaskTypesForCompany = useCallback((companyName: string): string[] => {
        const companyKey = normalizeText(companyName);
        if (!companyKey) return [];
        const fromTasks = Array.from(taskTypesByCompanyFromTasks.get(companyKey) || []);
        const fromOverrides = Array.isArray(taskTypeCompanyOverrides?.[companyKey])
            ? taskTypeCompanyOverrides[companyKey]
            : [];
        const merged = Array.from(new Set([...fromOverrides, ...fromTasks]));
        const selectedCompanyKey = normalizeCompanyKey(companyName);
        const matchingCompanyId =
            (companies || []).find((c: any) => {
                const name = String(c?.name || c?.companyName || c?.title || '').trim();
                return normalizeCompanyKey(name) === selectedCompanyKey;
            })?._id ||
            (companies || []).find((c: any) => {
                const name = String(c?.name || c?.companyName || c?.title || '').trim();
                return normalizeCompanyKey(name) === selectedCompanyKey;
            })?.id;
        const fromApi = (taskTypes || [])
            .filter((t: any) => {
                const typeCompanyId = String(t?.companyId || '').trim();
                return !typeCompanyId || (matchingCompanyId && typeCompanyId === String(matchingCompanyId));
            })
            .map((t: any) => (t?.name || '').toString().trim())
            .filter(Boolean);
        const combined = Array.from(new Set([...fromApi, ...merged]));
        if (selectedCompanyKey === SPEED_E_COM_COMPANY_KEY) {
            return restrictTaskTypesForCompany(companyName, combined)
                .sort((a, b) => a.localeCompare(b));
        }
        return restrictTaskTypesForCompany(companyName, combined)
            .sort((a, b) => a.localeCompare(b));
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role === 'manager' || role === 'marketer_manager') {
            const allowedKeys = allowedTaskTypeKeysForManager;
            return merged
                .filter((t) => allowedKeys.has((t || '').toString().trim().toLowerCase()))
                .sort((a, b) => a.localeCompare(b));
        }
        return merged.sort((a, b) => a.localeCompare(b));
    }, [allowedTaskTypeKeysForManager, companies, currentUser?.role, normalizeCompanyKey, normalizeText, restrictTaskTypesForCompany, taskTypeCompanyOverrides, taskTypes, taskTypesByCompanyFromTasks]);

    function getBrandCompanyNameSafe(b: any): string {
        const raw = (b?.company ?? (b as any)?.companyName) as any;
        if (typeof raw === 'string') return raw.toString().trim();
        if (raw && typeof raw === 'object') {
            return String(raw?.name || raw?.companyName || raw?.title || '').trim();
        }
        return '';
    }

    function getBrandNameSafe(b: any): string {
        return String(b?.name || b?.brandName || b?.brand || '').trim();
    }

    const getTaskTypesForCompanyBrand = useCallback((companyName: string, brandName: string): string[] => {
        const companyKey = normalizeCompanyKey(companyName);
        const brandKey = (brandName || '').toString().trim();
        if (!companyKey || !brandKey) return [];
        const brandDoc: any = (apiBrands || []).find((b: any) => {
            const bCompany = getBrandCompanyNameSafe(b);
            const bName = getBrandNameSafe(b);
            return normalizeCompanyKey(bCompany) === companyKey && normalizeText(bName) === normalizeText(brandKey);
        });
        const brandId = (brandDoc?.id || brandDoc?._id || '').toString();
        const mappedIds = brandId ? (taskTypeIdsByBrandId[brandId] || []) : [];
        const normalizeLabel = (v: unknown) => (v || '').toString().trim();
        const labelById = new Map<string, string>();
        (taskTypes || []).forEach((t: any) => {
            const id = (t?.id || t?._id || '').toString();
            const name = normalizeLabel(t?.name);
            if (id && name && !labelById.has(id)) labelById.set(id, name);
        });
        const labels = mappedIds.map((id) => labelById.get(id) || '').filter(Boolean);
        return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
    }, [apiBrands, normalizeCompanyKey, normalizeText, taskTypeIdsByBrandId, taskTypes]);

    const getTaskTypesForCompanyUser = useCallback((companyName: string, assignedToEmail: string): string[] => {
        const companyKey = normalizeCompanyKey(companyName);
        const emailKey = stripDeletedEmailSuffix(assignedToEmail).trim().toLowerCase();
        if (!companyKey || !emailKey) return [];
        const userDoc: any = (usersRef.current || []).find((u: any) => {
            const email = stripDeletedEmailSuffix(u?.email).trim().toLowerCase();
            return email && email === emailKey;
        });
        let userId = (userDoc?.id || userDoc?._id || '').toString();
        if (!userId) {
            const myEmailKey = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
            if (myEmailKey && myEmailKey === emailKey) {
                userId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString();
            }
        }
        if (!userId) return [];
        const wantedPrefix = `${companyKey}::${userId}::`;
        const ids: string[] = [];
        Object.entries(taskTypeIdsByCompanyUserBrandKey || {}).forEach(([key, value]) => {
            if (!key || !key.startsWith(wantedPrefix)) return;
            const arr = Array.isArray(value) ? value : [];
            arr.forEach((v) => {
                const s = (v || '').toString().trim();
                if (s) ids.push(s);
            });
        });
        if (ids.length === 0) return [];
        const labelById = new Map<string, string>();
        (taskTypes || []).forEach((t: any) => {
            const id = (t?.id || t?._id || '').toString();
            const name = (t?.name || '').toString().trim();
            if (id && name && !labelById.has(id)) labelById.set(id, name);
        });
        const labels = ids.map((id) => labelById.get(id) || '').filter(Boolean);
        return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
    }, [currentUser, normalizeCompanyKey, taskTypeIdsByCompanyUserBrandKey, taskTypes]);

    const getTaskTypesForCompanyUserBrand = useCallback((companyName: string, brandName: string, assignedToEmail: string): string[] => {
        const companyKey = normalizeCompanyKey(companyName);
        const brandKey = (brandName || '').toString().trim();
        const emailKey = stripDeletedEmailSuffix(assignedToEmail).trim().toLowerCase();
        if (!companyKey || !brandKey || !emailKey) return [];
        const userDoc: any = (usersRef.current || []).find((u: any) => {
            const email = stripDeletedEmailSuffix(u?.email).trim().toLowerCase();
            return email && email === emailKey;
        });
        let userId = (userDoc?.id || userDoc?._id || '').toString();
        if (!userId) {
            const myEmailKey = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
            if (myEmailKey && myEmailKey === emailKey) {
                userId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString();
            }
        }
        if (!userId) return [];
        const brandDoc: any = (apiBrands || []).find((b: any) => {
            const bCompany = getBrandCompanyNameSafe(b);
            const bName = getBrandNameSafe(b);
            return normalizeText(bCompany) === companyKey && normalizeText(bName) === normalizeText(brandKey);
        });
        const brandId = (brandDoc?.id || brandDoc?._id || '').toString();
        if (!brandId) return [];
        const key = `${companyKey}::${userId}::${brandId}`;
        const mappedIds = taskTypeIdsByCompanyUserBrandKey[key] || [];
        const labelById = new Map<string, string>();
        (taskTypes || []).forEach((t: any) => {
            const id = (t?.id || t?._id || '').toString();
            const name = (t?.name || '').toString().trim();
            if (id && name && !labelById.has(id)) labelById.set(id, name);
        });
        const labels = mappedIds.map((id) => labelById.get(id) || '').filter(Boolean);
        return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
    }, [apiBrands, currentUser, normalizeCompanyKey, normalizeText, taskTypeIdsByCompanyUserBrandKey, taskTypes]);

    const assistantManagerEmail = useMemo(() => {
        const role = (currentUser?.role || '').toString().trim().toLowerCase();
        if (role !== 'assistant') return '';
        const managerId = ((currentUser as any)?.managerId || '').toString();
        if (!managerId) return '';
        const list: any[] = Array.isArray(usersRef.current) ? (usersRef.current as any[]) : (users as any[]);
        const manager = (list || []).find((u: any) => {
            const id = (u?.id || u?._id || '').toString();
            return id && id === managerId;
        });
        return stripDeletedEmailSuffix(manager?.email || '').trim().toLowerCase();
    }, [currentUser?.role, (currentUser as any)?.managerId, users]);

    const assistantScopedTasks = useMemo(() => {
        const role = (currentUser?.role || '').toString().trim().toLowerCase();
        if (role !== 'assistant') return [] as Task[];
        const myEmail = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
        const normalizeAssignerEmail = (t: any) => {
            const assignedBy = (t as any)?.assignedBy;
            const assignedByUser = (t as any)?.assignedByUser;
            const email =
                (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
                (typeof assignedByUser === 'string' && assignedByUser.includes('@') ? assignedByUser : assignedByUser?.email) ||
                (typeof assignedBy === 'string' ? assignedBy : '') ||
                '';
            return stripDeletedEmailSuffix(email).trim().toLowerCase();
        };
        return (tasks || []).filter((t: any) => {
            const assignedToEmail = stripDeletedEmailSuffix((t as any)?.assignedTo || '').trim().toLowerCase();
            if (!myEmail || assignedToEmail !== myEmail) return false;
            if (!assistantManagerEmail) return true;
            return normalizeAssignerEmail(t) === assistantManagerEmail;
        });
    }, [assistantManagerEmail, currentUser?.email, currentUser?.role, tasks]);

    const availableBrands = useMemo(() => {
        const getCompanyName = (b: any): string => {
            const raw = b?.company ?? b?.companyName;
            if (typeof raw === 'string') return raw;
            if (raw && typeof raw === 'object') {
                return String(raw?.name || raw?.companyName || raw?.title || '').trim();
            }
            return '';
        };
        const getBrandName = (b: any): string => {
            return String(b?.name || b?.brandName || b?.brand || '').trim();
        };
        const role = (currentUser?.role || '').toString().trim().toLowerCase();
        const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
        const isMdImpexUser = currentUserCompany.includes('mdimpex') || currentUserCompany.includes('md_impex');
        const extractBrandName = (label: unknown) => {
            const raw = String(label || '').trim();
            if (!raw) return '';
            const match = raw.match(/^\d+\s*-\s*(.+)$/);
            return match ? match[1].trim() : raw;
        };
        if (role === 'assistant') {
            const companyKey = normalizeCompanyKey(filters.company === 'all' ? '' : filters.company);
            const taskBrands = (assistantScopedTasks || [])
                .filter((t: any) => {
                    if (!companyKey) return true;
                    const taskCompany = normalizeCompanyKey((t as any)?.companyName || (t as any)?.company);
                    return taskCompany === companyKey;
                })
                .map((t: any) => String((t as any)?.brand || '').trim())
                .filter(Boolean);
            return Array.from(new Set(taskBrands)).sort((a, b) => a.localeCompare(b));
        }
        if (filters.company === 'all') {
            const fromApi = brands
                .map((brand: any) => getBrandName(brand))
                .filter(Boolean);
            let merged = fromApi.slice();
            try {
                if (isMdImpexUser && mdAllowedBrands && mdAllowedBrands.length > 0) {
                    const allowed = mdAllowedBrands.map(b => extractBrandName(b)).filter(Boolean);
                    merged = [...merged, ...allowed];
                }
            } catch (err) {
                // ignore
            }
            return [...new Set(merged)].sort();
        }
        const companyKey = normalizeCompanyKey(filters.company);
        const mdKey = normalizeCompanyKey(MD_IMPEX_COMPANY_NAME);
        if (companyKey === mdKey && isMdImpexUser && mdAllowedBrands && mdAllowedBrands.length > 0) {
            const allowed = mdAllowedBrands.map(b => extractBrandName(b)).filter(Boolean);
            return Array.from(new Set(allowed)).sort();
        }
        return brands
            .filter((brand: any) => normalizeCompanyKey(getCompanyName(brand)) === companyKey)
            .map((brand: any) => getBrandName(brand))
            .filter(Boolean)
            .sort();
    }, [assistantScopedTasks, brands, currentUser?.role, filters.company, normalizeCompanyKey]);

    const getBrandLabelForFilter = useCallback((brandName: string): string => {
        const plain = String(brandName || '').trim();
        if (!plain) return '';
        const normalizedName = normalizeText(plain);
        const companyFilterKey = normalizeCompanyKey(filters.company === 'all' ? '' : filters.company);
        let candidates = (brands || []).filter((b: any) =>
            normalizeText(getBrandNameSafe(b)) === normalizedName
        );
        if (companyFilterKey && companyFilterKey !== 'all') {
            const byCompany = candidates.filter((b: any) =>
                normalizeCompanyKey(getBrandCompanyNameSafe(b)) === companyFilterKey
            );
            if (byCompany.length) candidates = byCompany;
        }
        if (!candidates.length) return plain;
        const brandDoc: any = candidates[0];
        const companyKey = normalizeCompanyKey(getBrandCompanyNameSafe(brandDoc));
        const groupNumber = String(brandDoc?.groupNumber || '').trim();
        if (companyKey === SPEED_E_COM_COMPANY_KEY && groupNumber) {
            return `${groupNumber} - ${plain}`;
        }
        return plain;
    }, [brands, filters.company, normalizeCompanyKey, normalizeText]);

    const availableTaskTypesForFilters = useMemo(() => {
        const brandAssignmentLabel = (taskTypes || []).find((t: any) => {
            const name = (t?.name || '').toString().trim().toLowerCase();
            return name === 'brand assignment';
        })?.name;
        const ensureBrandAssignment = (list: string[]) => {
            const label = (brandAssignmentLabel || '').toString().trim();
            if (!label) return list;
            const has = list.some((x) => (x || '').toString().trim().toLowerCase() === 'brand assignment');
            if (has) return list;
            return [...list, label];
        };
        const roleKey = normalizeRoleKey(currentUser?.role);
        const isPersonScoped = roleKey === 'assistant' || roleKey === 'sbm' || roleKey === 'rm' || roleKey === 'am' || roleKey === 'ar';
        if (roleKey === 'assistant') {
            const companyKey = normalizeText(filters.company === 'all' ? '' : filters.company);
            const brandKey = normalizeText(filters.brand === 'all' ? '' : filters.brand);
            const filtered = (assistantScopedTasks || [])
                .filter((t: any) => {
                    if (companyKey) {
                        const taskCompany = normalizeText((t as any)?.companyName || (t as any)?.company);
                        if (taskCompany !== companyKey) return false;
                    }
                    if (brandKey) {
                        const taskBrand = normalizeText((t as any)?.brand || '');
                        if (taskBrand !== brandKey) return false;
                    }
                    return true;
                })
                .map((t: any) => String((t as any)?.taskType || (t as any)?.type || '').trim())
                .filter(Boolean);
            const merged = ensureBrandAssignment(Array.from(new Set(filtered)));
            return restrictTaskTypesForCompany(filters.company, merged.sort((a, b) => a.localeCompare(b)));
        }
        if (filters.company !== 'all' && filters.brand !== 'all') {
            if (isPersonScoped) {
                return restrictTaskTypesForCompany(filters.company, ensureBrandAssignment(getTaskTypesForCompanyUserBrand(filters.company, filters.brand, currentUser?.email || '')));
            }
            return restrictTaskTypesForCompany(filters.company, ensureBrandAssignment(getTaskTypesForCompanyBrand(filters.company, filters.brand)));
        }
        if (filters.company !== 'all') {
            if (isPersonScoped) {
                return restrictTaskTypesForCompany(filters.company, ensureBrandAssignment(getTaskTypesForCompanyUser(filters.company, currentUser?.email || '')));
            }
            return restrictTaskTypesForCompany(filters.company, ensureBrandAssignment(getTaskTypesForCompany(filters.company)));
        }
        const fromOverrides = Object.values(taskTypeCompanyOverrides || {}).flatMap((arr) => (Array.isArray(arr) ? arr : []));
        const fromTasks = Array.from(taskTypesByCompanyFromTasks.values()).flatMap((set) => Array.from(set));
        const merged = ensureBrandAssignment(Array.from(new Set([...effectiveAvailableTaskTypes, ...fromOverrides, ...fromTasks])));
        const canonicalizeTypeLabel = (value: unknown): string => {
            const raw = (value == null ? '' : String(value)).trim();
            if (!raw) return '';
            const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
            if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') {
                return 'Troubleshoot';
            }
            return raw;
        };
        const dedupeByCanonicalKey = (items: string[]): string[] => {
            const map = new Map<string, string>();
            (items || []).forEach((x) => {
                const label = canonicalizeTypeLabel(x);
                if (!label) return;
                const key = label.toLowerCase();
                if (!map.has(key)) map.set(key, label);
            });
            return Array.from(map.values());
        };
        if (roleKey === 'manager' || roleKey === 'md_manager' || roleKey === 'ob_manager') {
            const fixed = ['Other Work', 'Troubleshoot', 'Regular', 'goggle']
                .map((x) => (x || '').toString().trim())
                .filter(Boolean);
            const uniqueByKey = new Map<string, string>();
            fixed.forEach((label) => {
                const key = label.toLowerCase();
                if (!uniqueByKey.has(key)) uniqueByKey.set(key, label);
            });
            return Array.from(uniqueByKey.values()).sort((a, b) => a.localeCompare(b));
        }
        return restrictTaskTypesForCompany(filters.company, dedupeByCanonicalKey(merged).sort((a, b) => a.localeCompare(b)));
    }, [allowedTaskTypeKeysForManager, assistantScopedTasks, effectiveAvailableTaskTypes, currentUser?.email, currentUser?.role, filters.brand, filters.company, getTaskTypesForCompany, getTaskTypesForCompanyBrand, getTaskTypesForCompanyUser, getTaskTypesForCompanyUserBrand, normalizeRoleKey, normalizeText, restrictTaskTypesForCompany, taskTypeCompanyOverrides, taskTypes, taskTypesByCompanyFromTasks]);

    const availableTaskTypesForNewTask = useMemo(() => {
        const role = String((currentUser as any)?.role || '').toString().trim().toLowerCase();
        if (role === 'troubleshoot_manager') {
            return ['Troubleshoot'];
        }
        if (!newTask.companyName) return [];
        const company = newTask.companyName;
        const baseCompany = () => restrictTaskTypesForCompany(company, getTaskTypesForCompany(company));
        const ensureManagerOtherWork = (list: string[]) => {
            if (role !== 'manager') return list;
            const normalized = (list || []).map((t) => (t || '').toString().trim().toLowerCase());
            if (normalized.includes('other work')) return list;
            return [...(list || []), 'Other Work'];
        };
        if (role === 'admin' || role === 'super_admin' || normalizeCompanyKey(company) === SPEED_E_COM_COMPANY_KEY) {
            return ensureManagerOtherWork(baseCompany());
        }
        const effectiveEmail = (currentUser?.email || newTask.assignedTo || '').toString();
        if (effectiveEmail && newTask.brand) {
            const specific = restrictTaskTypesForCompany(company, getTaskTypesForCompanyUserBrand(company, newTask.brand, effectiveEmail));
            if (specific.length > 0) return ensureManagerOtherWork(specific);
            const brandLevel = restrictTaskTypesForCompany(company, getTaskTypesForCompanyBrand(company, newTask.brand));
            if (brandLevel.length > 0) return ensureManagerOtherWork(brandLevel);
            return ensureManagerOtherWork(baseCompany());
        }
        if (effectiveEmail) {
            const userLevel = restrictTaskTypesForCompany(company, getTaskTypesForCompanyUser(company, effectiveEmail));
            if (userLevel.length > 0) return ensureManagerOtherWork(userLevel);
            return ensureManagerOtherWork(baseCompany());
        }
        if (newTask.brand) {
            const brandLevel = restrictTaskTypesForCompany(company, getTaskTypesForCompanyBrand(company, newTask.brand));
            if (brandLevel.length > 0) return ensureManagerOtherWork(brandLevel);
            return ensureManagerOtherWork(baseCompany());
        }
        return ensureManagerOtherWork(baseCompany());
    }, [currentUser, currentUser?.email, getTaskTypesForCompany, getTaskTypesForCompanyBrand, getTaskTypesForCompanyUser, getTaskTypesForCompanyUserBrand, newTask.brand, newTask.companyName, restrictTaskTypesForCompany]);

    const availableTaskTypesForEditTask = useMemo(() => {
        if (!editFormData.companyName) return availableTaskTypesForFilters;
        if (editFormData.brand && editFormData.assignedTo) {
            const fromPerson = restrictTaskTypesForCompany(editFormData.companyName, getTaskTypesForCompanyUserBrand(editFormData.companyName, editFormData.brand, editFormData.assignedTo));
            const current = (editFormData.taskType || '').toString().trim();
            if (!current) return fromPerson;
            const exists = fromPerson.some((t) => (t || '').toString().trim().toLowerCase() === current.toLowerCase());
            if (exists) return fromPerson;
            return [...fromPerson, current];
        }
        if (editFormData.assignedTo) {
            const fromUser = restrictTaskTypesForCompany(editFormData.companyName, getTaskTypesForCompanyUser(editFormData.companyName, editFormData.assignedTo));
            const current = (editFormData.taskType || '').toString().trim();
            if (!current) return fromUser;
            const exists = fromUser.some((t) => (t || '').toString().trim().toLowerCase() === current.toLowerCase());
            if (exists) return fromUser;
            return [...fromUser, current];
        }
        if (editFormData.brand) return restrictTaskTypesForCompany(editFormData.companyName, getTaskTypesForCompanyBrand(editFormData.companyName, editFormData.brand));
        return restrictTaskTypesForCompany(editFormData.companyName, getTaskTypesForCompany(editFormData.companyName));
    }, [availableTaskTypesForFilters, editFormData.assignedTo, editFormData.brand, editFormData.companyName, editFormData.taskType, getTaskTypesForCompany, getTaskTypesForCompanyBrand, getTaskTypesForCompanyUser, getTaskTypesForCompanyUserBrand, restrictTaskTypesForCompany]);

    const fetchCompanyBrandTaskTypeMapping = useCallback(async (companyName: string, brandName: string) => {
        try {
            const company = (companyName || '').toString().trim();
            const brand = (brandName || '').toString().trim();
            if (!company || !brand) return;
            const brandDoc: any = (apiBrands || []).find((b: any) => {
                const bCompany = getBrandCompanyNameSafe(b);
                const bName = getBrandNameSafe(b);
                return normalizeCompanyKey(bCompany) === normalizeCompanyKey(company) && normalizeText(bName) === normalizeText(brand);
            });
            const brandId = (brandDoc?.id || brandDoc?._id || '').toString();
            if (!brandId) return;
            const res = await companyBrandTaskTypeService.getMapping({ companyName: company, brandId, brandName: brand });
            const ids = (res?.data?.taskTypes || [])
                .map((t: any) => (t?.id || t?._id || '').toString())
                .filter(Boolean);
            setTaskTypeIdsByBrandId((prev) => ({ ...prev, [brandId]: ids }));
        } catch {
            // ignore
        }
    }, [apiBrands, normalizeCompanyKey, normalizeText]);

    const fetchUserBrandTaskTypeMappings = useCallback(async (companyName: string, assignedToEmail: string) => {
        try {
            const company = (companyName || '').toString().trim();
            const email = stripDeletedEmailSuffix(assignedToEmail).trim().toLowerCase();
            if (!company || !email) return;
            const userDoc: any = (usersRef.current || []).find((u: any) => {
                const uEmail = stripDeletedEmailSuffix(u?.email).trim().toLowerCase();
                return uEmail && uEmail === email;
            });
            let userId = (userDoc?.id || userDoc?._id || '').toString();
            if (!userId) {
                const myEmailKey = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
                if (myEmailKey && myEmailKey === email) {
                    userId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString();
                }
            }
            if (!userId) return;
            const res = await assignService.getUserMappings({ companyName: company, userId });
            const next: Record<string, string[]> = {};
            const brandNames = new Set<string>();
            const extraTaskTypes: any[] = [];
            (res?.data || []).forEach((m: any) => {
                const brandId = (m?.brandId || '').toString();
                if (!brandId) return;
                const ids = Array.isArray(m?.taskTypeIds) ? m.taskTypeIds.map((x: any) => (x || '').toString()).filter(Boolean) : [];
                const key = `${normalizeCompanyKey(m?.companyName || company)}::${userId}::${brandId}`;
                next[key] = ids;
                const tts = Array.isArray(m?.taskTypes) ? m.taskTypes : [];
                tts.forEach((t: any) => {
                    const id = (t?.id || t?._id || '').toString();
                    const name = (t?.name || '').toString().trim();
                    if (id && name) extraTaskTypes.push({ id, name });
                });
                if (ids.length > 0) {
                    const bName = (m?.brandName || '').toString().trim();
                    if (bName) brandNames.add(bName);
                }
            });
            if (extraTaskTypes.length > 0) {
                setTaskTypes((prev) => {
                    const list = Array.isArray(prev) ? [...prev] : [];
                    const byId = new Map<string, any>();
                    list.forEach((t: any) => {
                        const id = (t?.id || t?._id || '').toString();
                        if (id && !byId.has(id)) byId.set(id, t);
                    });
                    extraTaskTypes.forEach((t: any) => {
                        const id = (t?.id || t?._id || '').toString();
                        if (!id) return;
                        if (!byId.has(id)) {
                            byId.set(id, t);
                            return;
                        }
                        const existing = byId.get(id);
                        const existingName = (existing?.name || '').toString().trim();
                        const nextName = (t?.name || '').toString().trim();
                        if (!existingName && nextName) {
                            byId.set(id, { ...existing, name: nextName });
                        }
                    });
                    return Array.from(byId.values());
                });
            }
            setTaskTypeIdsByCompanyUserBrandKey((prev) => ({ ...prev, ...next }));
            setBrandNamesByCompanyUserKey((prev) => {
                const cuKey = `${normalizeCompanyKey(res?.data?.[0]?.companyName || company)}::${userId}`;
                const sorted = Array.from(brandNames).filter(Boolean).sort((a, b) => a.localeCompare(b));
                return { ...prev, [cuKey]: sorted };
            });
        } catch {
            // ignore
        }
    }, [currentUser, normalizeCompanyKey]);

    const fetchUserBrandTaskTypeMappingsCached = useCallback(async (companyName: string, assignedToEmail: string) => {
        const companyKey = normalizeCompanyKey(companyName);
        const emailKey = stripDeletedEmailSuffix(assignedToEmail).trim().toLowerCase();
        if (!companyKey || !emailKey) return;
        const cacheKey = `${companyKey}::${emailKey}`;
        const now = Date.now();
        const lastAt = userMappingsFetchedAtRef.current.get(cacheKey) || 0;
        if (lastAt && now - lastAt < USER_MAPPINGS_TTL_MS) return;
        const inFlight = userMappingsFetchInFlightRef.current.get(cacheKey);
        if (inFlight) return inFlight;
        const p = (async () => {
            try {
                await fetchUserBrandTaskTypeMappings(companyName, assignedToEmail);
                userMappingsFetchedAtRef.current.set(cacheKey, Date.now());
            } finally {
                userMappingsFetchInFlightRef.current.delete(cacheKey);
            }
        })();
        userMappingsFetchInFlightRef.current.set(cacheKey, p);
        return p;
    }, [fetchUserBrandTaskTypeMappings, normalizeCompanyKey]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        const isPersonScoped = role === 'assistant' || role === 'sbm' || role === 'rm' || role === 'am' || role === 'ar';
        if (!isPersonScoped) return;
        const company = (filters.company || '').toString().trim();
        if (!company || company === 'all') return;
        const email = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
        if (!email) return;
        void fetchUserBrandTaskTypeMappingsCached(company, email);
    }, [currentUser?.email, currentUser?.role, fetchUserBrandTaskTypeMappingsCached, filters.company]);

    useEffect(() => {
        const handler = (e: any) => {
            const detail = e?.detail || {};
            fetchCompanyBrandTaskTypeMapping(detail?.companyName || newTask.companyName, detail?.brandName || newTask.brand);
        };
        window.addEventListener('companyBrandTaskTypesUpdated', handler as any);
        return () => window.removeEventListener('companyBrandTaskTypesUpdated', handler as any);
    }, [fetchCompanyBrandTaskTypeMapping, newTask.brand, newTask.companyName]);

    useEffect(() => {
        if (!newTask.companyName || !newTask.brand) return;
        void fetchCompanyBrandTaskTypeMapping(newTask.companyName, newTask.brand);
    }, [fetchCompanyBrandTaskTypeMapping, newTask.brand, newTask.companyName]);

    useEffect(() => {
        if (!newTask.companyName) return;
        const email = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
        if (!email) return;
        void fetchUserBrandTaskTypeMappingsCached(newTask.companyName, email);
    }, [currentUser?.email, fetchUserBrandTaskTypeMappingsCached, newTask.companyName]);

    useEffect(() => {
        if (!showAddTaskModal) return;
        if (!newTask.companyName) return;
        const email = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
        if (!email) return;
        void fetchUserBrandTaskTypeMappingsCached(newTask.companyName, email);
    }, [currentUser?.email, fetchUserBrandTaskTypeMappingsCached, newTask.companyName, showAddTaskModal]);

    useEffect(() => {
        if (!showEditTaskModal) return;
        if (!editFormData.companyName || !editFormData.assignedTo) return;
        void fetchUserBrandTaskTypeMappingsCached(editFormData.companyName, editFormData.assignedTo);
    }, [editFormData.assignedTo, editFormData.companyName, fetchUserBrandTaskTypeMappingsCached, showEditTaskModal]);

    const formatDate = useCallback((dateString: string) => {
        try {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    }, []);

    const isMongoObjectId = useCallback((value: unknown) => {
        if (typeof value !== 'string') return false;
        return /^[a-f\d]{24}$/i.test(value);
    }, []);

    const navigateTo = (page: string) => {
        const viewMap: Record<
            string,
            | 'dashboard'
            | 'all-tasks'
            | 'calendar'
            | 'analyze'
            | 'team'
            | 'profile'
            | 'brands'
            | 'brand-detail'
            | 'access'
            | 'company-brand-task-types'
            | 'assign'
            | 'speed-ecom-reassign'
            | 'reviews'
            | 'other-work'
            | 'manager-monthly-rankings'
            | 'md-impex-strike'
            | 'md-impex-manual-strike'
            | 'md-impex-access'
            | 'personal-tasks'
            | 'assigned-by-me'
            | 'assigned-to-me'
            | 'headline'
        > = {
            'dashboard': 'dashboard',
            'tasks': 'all-tasks',
            'all-tasks': 'all-tasks',
            'calendar': 'calendar',
            'analyze': 'analyze',
            'team': 'team',
            'profile': 'profile',
            'brands': 'brands',
            'brand-detail': 'brands',
            'access': 'access',
            'company-brand-task-types': 'company-brand-task-types',
            'assign': 'assign',
            'speed-ecom-reassign': 'speed-ecom-reassign',
            'reviews': 'reviews',
            'manager-monthly-rankings': 'manager-monthly-rankings',
            'other-work': 'other-work',
            'md-impex-strike': 'md-impex-strike',
            'md-impex-manual-strike': 'md-impex-manual-strike',
            'md-impex-access': 'md-impex-access',
            'personal-tasks': 'personal-tasks',
            'assigned-by-me': 'assigned-by-me',
            'assigned-to-me': 'assigned-to-me',
            'headline': 'headline'
        };
        const targetView = viewMap[page];
        if (!targetView) return;
        const viewToModule: Record<typeof targetView, string> = {
            'dashboard': '',
            'all-tasks': 'tasks_page',
            'calendar': 'calendar_page',
            'analyze': 'reports_analytics',
            'team': 'team_page',
            'profile': 'profile_page',
            'brands': 'brands_page',
            'brand-detail': 'brands_page',
            'access': 'access_management',
            'company-brand-task-types': 'company_brand_task_type',
            'assign': 'assign_page',
            'speed-ecom-reassign': 'tasks_page',
            'reviews': 'reviews_page',
            'manager-monthly-rankings': 'tasks_page',
            'other-work': 'other_work_page',
            'md-impex-strike': '',
            'md-impex-manual-strike': '',
            'md-impex-access': '',
            'personal-tasks': '',
            'headline': '',
            'assigned-by-me': '',
            'assigned-to-me': ''
        };
        const moduleId = viewToModule[targetView];
        if (moduleId && !hasAccess(moduleId)) {
            toast.error('Access denied');
            setCurrentView('dashboard');
            return;
        }
        const routeMap: Partial<Record<string, string>> = {
            dashboard: routepath.dashboard,
            tasks: routepath.tasks,
            'all-tasks': routepath.tasks,
            calendar: routepath.calendar,
            analyze: routepath.analyze,
            team: routepath.team,
            access: routepath.access,
            profile: routepath.profile,
            brands: routepath.brands,
            'company-brand-task-types': routepath.companyBrandTaskTypes,
            assign: routepath.assign,
            'speed-ecom-reassign': routepath.speedEcomReassign,
            reviews: routepath.reviews,
            'manager-monthly-rankings': routepath.managerMonthlyRankings,
            'other-work': routepath.otherWork,
            'md-impex-strike': routepath.mdImpexStrike,
            'md-impex-manual-strike': routepath.mdImpexManualStrike,
            'md-impex-access': routepath.mdImpexAccess,
            'personal-tasks': routepath.personalTasks,
            'headline': routepath.headline,
            'assigned-by-me': routepath.assignedByMe,
            'assigned-to-me': routepath.assignedToMe
        };
        const targetPath = routeMap[page];
        setCurrentView(targetView);
        if (targetPath) {
            navigate(targetPath);
        }
    };

    useEffect(() => {
        if (!isAuthReady) return;
        const path = (location.pathname || '').toLowerCase();

        if (path === routepath.managerMonthlyRankings) {
            const roleKey = String((currentUser as any)?.role || '').trim().toLowerCase();
            if (roleKey !== 'manager' && roleKey !== 'md_manager' && roleKey !== 'all_manager') {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('calendar');
            return;
        }
        if (path === routepath.analyze) {
            if (!hasAccess('reports_analytics')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('analyze');
            return;
        }

        if (path === routepath.team) {
            if (!hasAccess('team_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('team');
            return;
        }
        if (path === routepath.profile) {
            if (!hasAccess('profile_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('profile');
            return;
        }
        if (path === routepath.companyBrandTaskTypes) {
            if (!hasAccess('company_brand_task_type')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('company-brand-task-types');
            return;
        }
        if (path === routepath.assign) {
            if (!hasAccess('assign_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('assign');
            return;
        }
        if (path === routepath.speedEcomReassign) {
            if (!hasAccess('tasks_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('speed-ecom-reassign');
            try {
                const params = new URLSearchParams(location.search || '');
                const taskId = params.get('taskId') || '';
                const found = taskId
                    ? (tasks || []).find((t: any) => String(t?.id || '') === String(taskId))
                    : null;
                setSpeedEcomReassignTask((found as Task) || null);
            } catch {
                setSpeedEcomReassignTask(null);
            }
            return;
        }
        if (path === routepath.reviews) {
            if (!hasAccess('reviews_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('reviews');
            return;
        }
        if (path === routepath.otherWork) {
            if (!hasAccess('other_work_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('other-work');
            return;
        }
        if (path === routepath.access) {
            if (!hasAccess('access_management')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('access');
            return;
        }
        if (path === routepath.brands) {
            if (!hasAccess('brands_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('brands');
            return;
        }
        if (path.startsWith('/brands/')) {
            if (!hasAccess('brands_page')) {
                toast.error('Access denied');
                navigate(routepath.dashboard);
                return;
            }
            setCurrentView('brand-detail');
            try {
                const rawBrandId = (location.pathname || '').split('/brands/')[1] || '';
                const brandIdOnly = rawBrandId.split('/')[0] || '';
                const decoded = decodeURIComponent(brandIdOnly);
                if (decoded) {
                    setSelectedBrandId(decoded);
                }
            } catch {
                // ignore
            }
            return;
        }
        if (path === routepath.dashboard || path === '/') {
            setCurrentView('dashboard');
        }
    }, [hasAccess, isAuthReady, location.pathname, location.search, currentUser, navigate]);

    const handleSpeedEcomReassignSubmit = useCallback(async (payload: { assignedTo: string; dueDate: string }) => {
        if (!speedEcomReassignTask?.id) {
            toast.error('Task not found');
            return false;
        }
        setIsSpeedEcomReassignSubmitting(true);
        try {
            const response = await taskService.updateTask(speedEcomReassignTask.id, {
                assignedTo: payload.assignedTo,
                dueDate: payload.dueDate,
            });
            if (response.success && response.data) {
                dispatch(taskUpserted(response.data as Task));
                return true;
            }
            toast.error(response.message || 'Failed to reassign task');
            return false;
        } catch (e: any) {
            const message = e?.response?.data?.message || e?.message || 'Failed to reassign task';
            toast.error(message);
            return false;
        } finally {
            setIsSpeedEcomReassignSubmitting(false);
        }
    }, [dispatch, speedEcomReassignTask?.id]);


    const getTaskBorderColor = useCallback((task: Task): string => {
        const isCompleted = task.status === 'completed' || task.completedApproval;
        if (isCompleted) {
            if (task.completedApproval) {
                return 'border-l-4 border-l-blue-500';
            }
            return 'border-l-4 border-l-green-500';
        } else if (isOverdueFn(task.dueDate, task.status)) {
            return 'border-l-4 border-l-red-500';
        } else if (task.priority === 'high') {
            return 'border-l-4 border-l-orange-500';
        } else if (task.priority === 'medium') {
            return 'border-l-4 border-l-yellow-500';
        } else if (task.priority === 'low') {
            return 'border-l-4 border-l-blue-500';
        } else {
            return 'border-l-4 border-l-gray-300';
        }
    }, [isOverdueFn]);

    const canEditDeleteTask = useCallback(
        (task: Task) => {
            const normalizeEmailSafe = (v: any): string => {
                if (!v) return '';
                if (typeof v === 'string') return v.trim().toLowerCase();
                if (typeof v === 'object' && v !== null) {
                    const email = (v as any).email;
                    if (typeof email === 'string') return email.trim().toLowerCase();
                }
                return String(v).trim().toLowerCase();
            };
            const myEmail = normalizeEmailSafe(currentUser?.email);
            const assignedByEmail = normalizeEmailSafe((task as any)?.assignedBy) || normalizeEmailSafe((task as any)?.assignedByUser?.email);
            const role = String((currentUser as any)?.role || '').trim().toLowerCase();
            if (role === 'super_admin' || role === 'admin') return true;
            if (role === 'rm' || role === 'am') return false;
            return Boolean(myEmail && assignedByEmail && myEmail === assignedByEmail);
        },
        [currentUser],
    );

    const canEditTask = useCallback((task: Task): boolean => {
        const normalizeEmailSafe = (v: any): string => {
            if (!v) return '';
            if (typeof v === 'string') return stripDeletedEmailSuffix(v).trim().toLowerCase();
            if (typeof v === 'object' && v !== null) {
                const email = (v as any).email;
                if (typeof email === 'string') return stripDeletedEmailSuffix(email).trim().toLowerCase();
            }
            return stripDeletedEmailSuffix(v).trim().toLowerCase();
        };
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        if (role === 'super_admin' || role === 'admin') return true;
        const normalizeCompanyKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
        const isMdImpexTask = normalizeCompanyKey(task?.companyName || (task as any)?.company) === 'mdimpex';
        if (isMdImpexTask && (role === 'md_manager' || role === 'ob_manager' || role === 'manager' || role === 'marketer_manager')) return true;
        if (role === 'rm' || role === 'am') return true;
        const myEmail = normalizeEmailSafe(currentUser?.email);
        const assignedByEmail =
            normalizeEmailSafe((task as any)?.assignedBy) || normalizeEmailSafe((task as any)?.assignedByUser?.email);
        const isAssigner = Boolean(myEmail && assignedByEmail && myEmail === assignedByEmail);
        if (isAssigner) return true;
        const isSpeedEcomTask = normalizeCompanyKey(task?.companyName || (task as any)?.company) === 'speedecom';
        const assignedToEmail = normalizeEmailSafe((task as any)?.assignedTo) || normalizeEmailSafe((task as any)?.assignedToUser?.email);
        const isAssignee = Boolean(myEmail && assignedToEmail && myEmail === assignedToEmail);
        if (isSpeedEcomTask && isAssignee) return true;
        return false;
    }, [currentUser]);

    const canMarkTaskDone = useCallback(
        (task: Task) => {
            if (task.completedApproval) return false;
            String((currentUser as any)?.role || '').trim().toLowerCase();
            const normalizeEmailSafe = (v: any): string => {
                if (!v) return '';
                if (typeof v === 'string') return stripDeletedEmailSuffix(v).trim().toLowerCase();
                if (typeof v === 'object' && v !== null) {
                    const email = (v as any).email;
                    if (typeof email === 'string') return stripDeletedEmailSuffix(email).trim().toLowerCase();
                }
                return stripDeletedEmailSuffix(String(v)).trim().toLowerCase();
            };

            const myEmail = normalizeEmailSafe((currentUser as any)?.email);
            const assignedToEmail =
                normalizeEmailSafe((task as any)?.assignedToUser?.email) ||
                normalizeEmailSafe((task as any)?.assignedTo);

            return Boolean(myEmail && assignedToEmail && assignedToEmail === myEmail);
        },
        [currentUser],
    );

    const handleUpdateUser = useCallback(async (userId: string, updatedData: Partial<UserType>) => {
        const requesterRole = (currentUser?.role || '').toString().trim().toLowerCase();
        const allowedByPerms = hasAccess('user_management');
        if (!allowedByPerms) {
            const target = (usersRef.current || []).find((u: any) => (u?.id || u?._id || '').toString() === userId?.toString());
            const targetRole = (target?.role || '').toString().trim().toLowerCase();
            const toRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
            const requesterRoleKey = toRoleKey(requesterRole);
            const targetRoleKey = toRoleKey(targetRole);
            const isAssistantLike = (rk: string) => rk === 'assistant'
                || rk === 'assistance'
                || rk === 'assistence'
                || rk === 'assistece'
                || rk === 'sub_assistance'
                || rk === 'sub_assistence'
                || rk === 'sub_assistece'
                || rk === 'sub_assist'
                || rk === 'sub_assistant'
                || rk.includes('assistant');
            if (requesterRoleKey === 'md_manager') {
                if (targetRoleKey !== 'manager' && !isAssistantLike(targetRoleKey)) throw new Error('Only administrators can edit users');
            } else if (requesterRoleKey === 'ob_manager') {
                if (!isAssistantLike(targetRoleKey)) throw new Error('Only administrators can edit users');
            } else if (requesterRoleKey === 'manager') {
                if (!isAssistantLike(targetRoleKey)) throw new Error('Only administrators can edit users');
            } else if (requesterRoleKey === 'sbm') {
                if (targetRoleKey !== 'rm' && targetRoleKey !== 'am') throw new Error('Only administrators can edit users');
            } else if (requesterRoleKey === 'rm') {
                if (targetRoleKey !== 'am') throw new Error('Only administrators can edit users');
            } else {
                throw new Error('Only administrators can edit users');
            }
        }
        const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString();
        if (myId && userId?.toString() === myId) {
            throw new Error('You cannot edit your own account');
        }
        try {
            const response = await authService.updateUser(userId, updatedData);
            if (response.success) {
                const existingUser = (usersRef.current || []).find((u: any) => (u.id || u._id) === userId) || {};
                dispatch(userUpserted({ ...existingUser, ...updatedData, id: userId } as UserType));
                return;
            } else {
                throw new Error(response.message || 'Failed to update user');
            }
        } catch (error: any) {
            throw error;
        }
    }, [currentUser, hasAccess]);

    const handleCreateUser = useCallback(async (newUser: Partial<UserType>) => {
        const requesterRole = (currentUser?.role || '').toString().trim().toLowerCase();
        const allowedByPerms = hasAccess('user_management');
        if (!allowedByPerms) {
            const targetRole = (newUser?.role || '').toString().trim().toLowerCase();
            if (requesterRole === 'md_manager') {
                // allow
            } else if (requesterRole === 'ob_manager') {
                if (targetRole !== 'assistant' && targetRole !== 'sub_assistance') throw new Error('You do not have permission to create users');
            } else if (requesterRole === 'manager') {
                if (targetRole !== 'assistant') throw new Error('You do not have permission to create users');
            } else if (requesterRole === 'sbm') {
                if (targetRole !== 'rm' && targetRole !== 'am') throw new Error('You do not have permission to create users');
            } else if (requesterRole === 'rm') {
                if (targetRole !== 'am') throw new Error('You do not have permission to create users');
            } else if (requesterRole === 'admin' || requesterRole === 'super_admin') {
                // allow
            } else {
                throw new Error('You do not have permission to create users');
            }
        }
        try {
            const isManager = (currentUser?.role || '').toLowerCase() === 'manager';
            const roleKey = (isManager ? 'assistant' : ((newUser.role as any) || 'assistant')) as string;
            const payload = {
                name: newUser.name || '',
                email: newUser.email || '',
                password: newUser.password || '',
                role: roleKey,
                managerId: roleKey === 'assistant' ? undefined : (newUser as any).managerId,
                companyName: (newUser as any).companyName || (currentUser as any)?.companyName || '',
                phone: newUser.phone,
                department: newUser.department,
                position: newUser.position
            };
            const response = await authService.createUser(payload as any);
            if (response.success && response.data) {
                dispatch(userUpserted(response.data as UserType));
            } else {
                throw new Error(response.message || 'Failed to create user');
            }
        } catch (error: any) {
            throw error;
        }
    }, [currentUser, hasAccess]);

    const handleDeleteUser = useCallback(async (userId: string) => {
        const requesterRole = (currentUser?.role || '').toString().trim().toLowerCase();
        const allowedByPerms = hasAccess('user_management');
        if (!allowedByPerms) {
            const target = (usersRef.current || []).find((u: any) => (u?.id || u?._id || '').toString() === userId?.toString());
            const targetRole = (target?.role || '').toString().trim().toLowerCase();
            if (requesterRole === 'md_manager') {
                if (targetRole !== 'manager' && targetRole !== 'assistant' && targetRole !== 'sub_assistance') throw new Error('Only administrators can delete users');
            } else if (requesterRole === 'ob_manager') {
                if (targetRole !== 'assistant' && targetRole !== 'sub_assistance') throw new Error('Only administrators can delete users');
            } else if (requesterRole === 'manager') {
                if (targetRole !== 'assistant' && targetRole !== 'sub_assistance') throw new Error('Only administrators can delete users');
            } else if (requesterRole === 'sbm') {
                if (targetRole !== 'rm' && targetRole !== 'am') throw new Error('Only administrators can delete users');
            } else if (requesterRole === 'rm') {
                if (targetRole !== 'am') throw new Error('Only administrators can delete users');
            } else {
                throw new Error('Only administrators can delete users');
            }
        }
        const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString();
        if (myId && userId?.toString() === myId) {
            throw new Error('You cannot delete your own account');
        }
        if (userId === currentUser.id) {
            throw new Error('You cannot delete your own account');
        }
        try {
            const response = await authService.deleteUser(userId);
            const isSuccess = response && (response.success === true || !response.error);
            if (isSuccess) {
                dispatch(userRemoved(userId));
            } else {
                throw new Error(response?.message || 'Failed to delete user');
            }
        } catch (error: any) {
            throw error;
        }
    }, [currentUser, hasAccess]);

    const getAssignedUserInfo = useCallback(
        (task: Task): { name: string; email: string } => {
            if (task.assignedToUser?.email) {
                const email = stripDeletedEmailSuffix(task.assignedToUser.email);
                return {
                    name: task.assignedToUser.name || 'User',
                    email,
                };
            }
            if (task.assignedTo) {
                if (typeof task.assignedTo === 'string') {
                    const email = stripDeletedEmailSuffix(task.assignedTo);
                    return {
                        name: (email.split('@')[0] || '').trim() || 'User',
                        email,
                    };
                }
                if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
                    const email = stripDeletedEmailSuffix((task.assignedTo as any)?.email);
                    return {
                        name: task.assignedTo.name || 'User',
                        email,
                    };
                }
                return {
                    name: 'Unknown User',
                    email: 'unknown@example.com',
                };
            }
            return {
                name: 'Unknown User',
                email: 'unknown@example.com',
            };
        },
        [users],
    );

    const availableBrandOptions = useMemo((): Array<{ value: string; label: string; ownerId?: string; createdBy?: string }> => {
        const company = newTask.companyName;
        if (!company) return [];
        const companyKey = normalizeCompanyKey(company);
        const byNameKey = new Map<string, { value: string; label: string; ownerId?: string; createdBy?: string }>();
        const addOption = (plainName: string) => {
            const name = (plainName || '').toString().trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (byNameKey.has(key)) return;
            const brandDoc: any = brandLookupMap.get(`${companyKey}::${normalizeText(name)}`);
            const groupNumber = String((brandDoc as any)?.groupNumber || '').trim();
            const label = groupNumber ? `${groupNumber} - ${name}` : name;

            const ownerObj = (brandDoc as any)?.ownerId || (brandDoc as any)?.owner;
            const ownerId = typeof ownerObj === 'string' ? ownerObj : (ownerObj?.id || ownerObj?._id);
            const createdByObj = (brandDoc as any)?.createdBy;
            const createdBy = typeof createdByObj === 'string' ? createdByObj : (createdByObj?.id || createdByObj?._id || createdByObj?.email);

            byNameKey.set(key, {
                value: name,
                label,
                ownerId: typeof ownerId === 'string' ? ownerId : undefined,
                createdBy: typeof createdBy === 'string' ? createdBy : undefined
            });
        };
        const email = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
        if (email) {
            const userDoc: any = (usersRef.current || []).find((u: any) => {
                const uEmail = stripDeletedEmailSuffix(u?.email).trim().toLowerCase();
                return uEmail && uEmail === email;
            });
            let userId = (userDoc?.id || userDoc?._id || '').toString();
            if (!userId) {
                const myEmailKey = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
                if (myEmailKey && myEmailKey === email) {
                    userId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString();
                }
            }
            const cuKey = `${companyKey}::${userId}`;
            const assigned = Array.isArray(brandNamesByCompanyUserKey[cuKey]) ? brandNamesByCompanyUserKey[cuKey] : [];
            if (assigned.length > 0) {
                assigned.forEach(addOption);
            }
        }
        (brands || [])
            .filter(brand => normalizeCompanyKey(getBrandCompanyNameSafe(brand)) === companyKey)
            .map(brand => getBrandNameSafe(brand))
            .filter(Boolean)
            .forEach(addOption);
        return Array.from(byNameKey.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [brandLookupMap, brandNamesByCompanyUserKey, brands, currentUser?.email, getBrandCompanyNameSafe, getBrandNameSafe, newTask.companyName, normalizeCompanyKey, normalizeText, stripDeletedEmailSuffix]);

    const getAvailableBrandOptions = useCallback(() => availableBrandOptions, [availableBrandOptions]);

    const editFormBrandOptions = useMemo((): Array<{ value: string; label: string }> => {
        const company = editFormData.companyName;
        if (!company) return [];
        const companyKey = normalizeCompanyKey(company);
        const byNameKey = new Map<string, { value: string; label: string }>();
        const addOption = (plainName: string) => {
            const name = (plainName || '').toString().trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (byNameKey.has(key)) return;
            const brandDoc: any = brandLookupMap.get(`${companyKey}::${normalizeText(name)}`);
            const groupNumber = String((brandDoc as any)?.groupNumber || '').trim();
            const label = groupNumber ? `${groupNumber} - ${name}` : name;
            byNameKey.set(key, { value: name, label });
        };
        const email = stripDeletedEmailSuffix(editFormData.assignedTo).trim().toLowerCase();
        if (email) {
            const userDoc: any = (usersRef.current || []).find((u: any) => {
                const uEmail = stripDeletedEmailSuffix(u?.email).trim().toLowerCase();
                return uEmail && uEmail === email;
            });
            const userId = (userDoc?.id || userDoc?._id || '').toString();
            const cuKey = `${companyKey}::${userId}`;
            const assigned = Array.isArray(brandNamesByCompanyUserKey[cuKey]) ? brandNamesByCompanyUserKey[cuKey] : [];
            if (assigned.length > 0) {
                assigned.forEach(addOption);
            }
        }
        (brands || [])
            .filter(brand => normalizeCompanyKey(getBrandCompanyNameSafe(brand)) === companyKey)
            .map(brand => (brand.name || '').toString().trim())
            .filter(Boolean)
            .forEach(addOption);
        return Array.from(byNameKey.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [brandLookupMap, brandNamesByCompanyUserKey, brands, editFormData.assignedTo, editFormData.companyName, getBrandCompanyNameSafe, getBrandNameSafe, normalizeCompanyKey, normalizeText, stripDeletedEmailSuffix]);

    const getEditFormBrandOptions = useCallback(() => editFormBrandOptions, [editFormBrandOptions]);

    const _formatBrandWithGroupNumber = useCallback((task: any): string => {
        const plain = String(task?.brand || '').trim();
        if (!plain) return '';

        // First try to use brandDetails from the task (included in API response)
        const brandDetails = task?.brandDetails;
        if (brandDetails?.groupNumber) {
            return `${brandDetails.groupNumber} - ${plain}`;
        }

        // Fallback to existing brandLookupMap logic
        const company = String(task?.companyName || task?.company || '').trim();
        const brandId = (task?.brandId || '').toString().trim();

        // Fast lookup by brandId
        let brandDoc: any = null;
        if (brandId) {
            brandDoc = brandLookupMap.get(brandId);
        }

        // Fallback lookup by company+name
        if (!brandDoc) {
            const companyKey = normalizeCompanyKey(company);
            const nameKey = normalizeText(plain);
            if (companyKey && nameKey) {
                const compoundKey = `${companyKey}::${nameKey}`;
                brandDoc = brandLookupMap.get(compoundKey);
            }
        }

        const groupNumber = String(brandDoc?.groupNumber || '').trim();
        return groupNumber ? `${groupNumber} - ${plain}` : plain;
    }, [brandLookupMap, normalizeCompanyKey, normalizeText]);

    void _formatBrandWithGroupNumber;

    const handleSaveComment = useCallback(async (taskId: string, comment: string): Promise<CommentType> => {
        try {
            const response = await taskService.addComment(taskId, comment);
            if (response.success && response.data) {
                const commentData = response.data;
                const formattedComment: CommentType = {
                    id: commentData.id || commentData._id || `comment-${Date.now()}`,
                    taskId: commentData.taskId || taskId,
                    userId: commentData.userId || currentUser.id,
                    userName: commentData.userName || currentUser.name,
                    userEmail: commentData.userEmail || currentUser.email,
                    userRole: commentData.userRole || currentUser.role,
                    content: commentData.content || comment,
                    createdAt: commentData.createdAt || new Date().toISOString(),
                    updatedAt: commentData.updatedAt || commentData.createdAt || new Date().toISOString(),
                };
                toast.success('Comment saved successfully!');
                const existingTask = tasks.find(t => t.id === taskId);
                if (existingTask) {
                    const updatedTask = {
                        ...existingTask,
                        latestComment: {
                            content: formattedComment.content,
                            userName: formattedComment.userName,
                            userEmail: formattedComment.userEmail,
                            createdAt: formattedComment.createdAt
                        }
                    };
                    dispatch(taskUpserted(updatedTask as Task));
                }
                return formattedComment;
            } else {
                toast.error(response.message || 'Failed to save comment');
                throw new Error(response.message || 'Failed to save comment');
            }
        } catch (error: any) {
            const mockComment: CommentType = {
                id: `mock-${Date.now()}`,
                taskId: taskId,
                userId: currentUser.id,
                userName: currentUser.name,
                userEmail: currentUser.email,
                userRole: currentUser.role,
                content: comment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            toast.success('Comment saved locally (offline mode)');
            return mockComment;
        }
    }, [currentUser, tasks, dispatch]);

    const handleDeleteComment = useCallback(async (taskId: string, commentId: string) => {
        try {
            if (!taskService.deleteComment) {
                toast.success('Comment deleted (mock)');
                return;
            }
            const response = await taskService.deleteComment(taskId, commentId);
            if (response && response.success) {
                toast.success('Comment deleted successfully');
                const existingTask = tasks.find(t => t.id === taskId);
                if (existingTask) {
                    const updatedTask = {
                        ...existingTask,
                        latestComment: null
                    };
                    dispatch(taskUpserted(updatedTask as Task));
                }
            } else {
                toast.error(response?.message || 'Failed to delete comment');
            }
        } catch (error: any) {
            toast.error('Failed to delete comment');
        }
    }, [tasks, dispatch]);

    const handleFetchTaskComments = useCallback(async (taskId: string): Promise<CommentType[]> => {
        try {
            const response = await taskService.fetchComments(taskId);
            if (!response) {
                return [];
            }
            if (response.success && Array.isArray(response.data)) {
                return response.data.map((comment: any): CommentType => ({
                    id: comment.id?.toString() || comment._id?.toString() || `${taskId}-${Date.now()}`,
                    taskId: comment.taskId?.toString() || taskId,
                    userId: comment.userId?.toString() || 'unknown-user',
                    userName: comment.userName || 'User',
                    userEmail: comment.userEmail || 'unknown@example.com',
                    userRole: comment.userRole || 'user',
                    content: comment.content || '',
                    createdAt: comment.createdAt || new Date().toISOString(),
                    updatedAt: comment.updatedAt || comment.createdAt || new Date().toISOString()
                }));
            }
            return [];
        } catch (error: any) {
            return [];
        }
    }, []);

    const isSbmUser = useMemo(() => {
        const roleKey = String((currentUser as any)?.role || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
        return roleKey === 'sbm';
    }, [currentUser]);

    const getCommentSidebarComments = useCallback((taskId: string): CommentType[] => {
        const key = String(taskId || '').trim();
        if (!key) return [];
        return Array.isArray(commentSidebarCommentsByTaskId[key]) ? commentSidebarCommentsByTaskId[key] : [];
    }, [commentSidebarCommentsByTaskId]);

    const handleOpenTaskCommentSidebar = useCallback(async (task: Task) => {
        if (!task?.id) return;
        if (!isSbmUser) return;
        setCommentSidebarTask(task);
        setShowTaskCommentSidebar(true);
        setCommentDraft('');
        setCommentSidebarLoadingComments(true);
        try {
            const comments = await handleFetchTaskComments(String(task.id));
            setCommentSidebarCommentsByTaskId(prev => ({
                ...prev,
                [String(task.id)]: comments
            }));
        } finally {
            setCommentSidebarLoadingComments(false);
        }
    }, [handleFetchTaskComments, isSbmUser]);

    const handleCloseTaskCommentSidebar = useCallback(() => {
        setShowTaskCommentSidebar(false);
        setCommentSidebarTask(null);
        setCommentDraft('');
        setCommentSidebarLoading(false);
        setCommentSidebarLoadingComments(false);
    }, []);

    const handleSubmitTaskComment = useCallback(async () => {
        if (!commentSidebarTask?.id) return;
        if (!isSbmUser) return;
        const content = (commentDraft || '').trim();
        if (!content) return;
        const taskId = String(commentSidebarTask.id);
        setCommentSidebarLoading(true);
        try {
            const saved = await handleSaveComment(taskId, content);
            setCommentSidebarCommentsByTaskId(prev => {
                const next = { ...prev };
                const current = Array.isArray(next[taskId]) ? next[taskId] : [];
                next[taskId] = [...current, saved];
                return next;
            });
            setCommentDraft('');
        } finally {
            setCommentSidebarLoading(false);
        }
    }, [commentDraft, commentSidebarTask, handleSaveComment, isSbmUser]);

    const handleReassignTask = useCallback(async (taskId: string, newAssigneeId: string, dueDate?: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }
            const normalizeEmailSafe = (v: unknown): string => stripDeletedEmailSuffix(v).trim().toLowerCase();
            const myEmail = normalizeEmailSafe((currentUser as any)?.email);
            const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
            const KEYURI_EMAIL = 'keyurismartbiz@gmail.com';
            const RUTU_EMAIL = 'rutusmartbiz@gmail.com';
            const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
            const isAssistantRole = (v: unknown) => {
                const r = normalizeRole(v);
                return r === 'assistant' || r === 'sub_assistance' || r === 'assistance' || r.includes('assistant');
            };
            const myRoleKey = normalizeRole((currentUser as any)?.role);
            const isObManager = myRoleKey === 'ob_manager' || myRoleKey === 'obmanager';
            const isManagerRole = myRoleKey === 'manager' || myRoleKey === 'md_manager';
            const isSbmRole = myRoleKey === 'sbm';
            const isRmOrAmRole = myRoleKey === 'rm' || myRoleKey === 'am';
            const assignedByEmail = normalizeEmailSafe((task as any)?.assignedByUser?.email || (task as any)?.assignedBy);
            const isTaskAssigner = Boolean(myEmail && assignedByEmail && myEmail === assignedByEmail);
            const normalizeCompanyKey = (value: unknown): string => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
            const isSpeedEcomTask = normalizeCompanyKey((task as any)?.companyName || (task as any)?.company) === 'speedecom';
            const taskStatusKey = String((task as any)?.status || '').trim().toLowerCase();
            const isTaskCompleted = taskStatusKey === 'completed';
            const findUserByIdOrEmail = (value: unknown): UserType | undefined => {
                const raw = (value == null ? '' : String(value)).trim();
                if (!raw) return undefined;
                const lowered = raw.toLowerCase();
                return (users || []).find((u: any) => {
                    const id = String(u?.id || u?._id || '').trim();
                    const email = String(u?.email || '').trim().toLowerCase();
                    return (id && id === raw) || (email && email === lowered);
                });
            };
            const resolveAssignerRole = (t: any): string => {
                const direct = normalizeRole(t?.assignedByUser?.role || t?.assignedBy?.role);
                if (direct) return direct;
                const candidate = t?.assignedByUser || t?.assignedBy;
                if (!candidate) return '';
                const idOrEmail = typeof candidate === 'string'
                    ? candidate
                    : (candidate?.id || candidate?._id || candidate?.email || '');
                return normalizeRole(findUserByIdOrEmail(idOrEmail)?.role);
            };
            const directEmail = newAssigneeId && newAssigneeId.includes('@') ? normalizeEmailSafe(newAssigneeId) : '';
            const isRutuDirect = Boolean(directEmail && directEmail === normalizeEmailSafe(RUTU_EMAIL));
            const newAssignee = directEmail ? findUserByIdOrEmail(directEmail) : findUserByIdOrEmail(newAssigneeId);
            const nextAssigneeEmail = directEmail || normalizeEmailSafe((newAssignee as any)?.email);
            const nextAssigneeRole = normalizeRole((newAssignee as any)?.role);
            const isSubAssistance = nextAssigneeRole === 'sub_assistance';
            const isAssistantCandidate = Boolean(nextAssigneeEmail && (isAssistantRole(nextAssigneeRole) || isAssistantRole((newAssignee as any)?.role)));
            const isObManagerDirectEmail = Boolean(isObManager && directEmail);
            const allowedPairUserIds = (() => {
                const ids = new Set<string>();
                if (myId) ids.add(myId);
                const list = Array.isArray(users) ? users : [];
                const myManagerIdKey = String((currentUser as any)?.managerId || '').trim();
                if (myRoleKey === 'rm' && myId) {
                    list.forEach((u: any) => {
                        const uid = String(u?.id || u?._id || '').trim();
                        const urole = normalizeRole(u?.role);
                        const mgr = String(u?.managerId || '').trim();
                        if (uid && urole === 'am' && mgr && mgr === myId) ids.add(uid);
                    });
                }
                if (myRoleKey === 'am' && myManagerIdKey) ids.add(myManagerIdKey);
                return ids;
            })();
            const assignedToCandidate: any = (task as any)?.assignedToUser || (task as any)?.assignedTo;
            const assignedToId = typeof assignedToCandidate === 'object'
                ? String(assignedToCandidate?.id || assignedToCandidate?._id || '').trim()
                : '';
            const assignedToEmail = normalizeEmailSafe(
                typeof assignedToCandidate === 'string'
                    ? (assignedToCandidate.includes('@') ? assignedToCandidate : '')
                    : (assignedToCandidate?.email || '')
            );
            const isTaskAssignee = Boolean(
                (myEmail && assignedToEmail && myEmail === assignedToEmail) ||
                (myId && assignedToId && myId === assignedToId)
            );
            const assignedByCandidateResolved: any = (task as any)?.assignedByUser || (task as any)?.assignedBy;
            const assignedById = typeof assignedByCandidateResolved === 'object'
                ? String(assignedByCandidateResolved?.id || assignedByCandidateResolved?._id || '').trim()
                : '';
            const assignedByEmailKey = normalizeEmailSafe(
                typeof assignedByCandidateResolved === 'string'
                    ? (assignedByCandidateResolved.includes('@') ? assignedByCandidateResolved : '')
                    : (assignedByCandidateResolved?.email || '')
            );
            const assignedByUser = (assignedById || assignedByEmailKey)
                ? findUserByIdOrEmail(assignedById || assignedByEmailKey)
                : undefined;
            const assignedByUserId = String((assignedByUser as any)?.id || (assignedByUser as any)?._id || assignedById || '').trim();
            const canReassignByPairEmailFallback = (() => {
                if (!isRmOrAmRole || !isTaskCompleted) return false;
                const creatorEmailKey = normalizeEmailSafe(assignedByEmailKey || assignedByEmail);
                if (!creatorEmailKey) return false;
                const list = Array.isArray(users) ? users : [];
                if (myRoleKey === 'rm' && myId) {
                    return list.some((u: any) => {
                        const urole = normalizeRole(u?.role);
                        const mgr = String(u?.managerId || '').trim();
                        const uemail = normalizeEmailSafe(u?.email);
                        return urole === 'am' && mgr === myId && uemail && uemail === creatorEmailKey;
                    });
                }
                if (myRoleKey === 'am') {
                    const myManagerIdKey = String((currentUser as any)?.managerId || '').trim();
                    const myManager = myManagerIdKey ? list.find((u: any) => String(u?.id || u?._id || '').trim() === myManagerIdKey) : undefined;
                    const managerEmail = normalizeEmailSafe((myManager as any)?.email);
                    return Boolean(managerEmail && managerEmail === creatorEmailKey);
                }
                return false;
            })();
            const canReassignByPair = Boolean(
                isRmOrAmRole &&
                isTaskCompleted &&
                (
                    isTaskAssigner ||
                    (assignedByUserId && allowedPairUserIds.has(assignedByUserId)) ||
                    canReassignByPairEmailFallback
                )
            );
            const isAllowedReassign = isSpeedEcomTask
                ? Boolean(
                    nextAssigneeEmail &&
                    isTaskCompleted &&
                    (
                        isTaskAssigner ||
                        (isSbmRole && isTaskAssigner) ||
                        (isRmOrAmRole && (isTaskAssignee || (assignedByUserId && allowedPairUserIds.has(assignedByUserId))))
                    )
                )
                : Boolean(
                    (isManagerRole && isTaskAssigner && nextAssigneeEmail) ||
                    (myEmail && myEmail === KEYURI_EMAIL && nextAssigneeEmail && (isRutuDirect || isSubAssistance)) ||
                    (isObManager && nextAssigneeEmail && (isAssistantCandidate || isObManagerDirectEmail)) ||
                    (nextAssigneeEmail && canReassignByPair)
                );
            if (!isAllowedReassign) {
                toast.error('You do not have permission to reassign tasks');
                return;
            }
            void isAssistantRole;
            void resolveAssignerRole;
            const response = await taskService.updateTask(taskId, {
                assignedTo: nextAssigneeEmail,
                dueDate: dueDate || (task as any)?.dueDate,
                assignedToUser: newAssignee ? {
                    id: (newAssignee as any).id,
                    name: (newAssignee as any).name,
                    email: (newAssignee as any).email,
                    role: (newAssignee as any).role
                } : undefined
            });
            if (response.success && response.data) {
                dispatch(taskUpserted(response.data as Task));
                toast.success(`Task reassigned to ${newAssignee ? (newAssignee as any).name : nextAssigneeEmail}`);
            } else {
                toast.error(response.message || 'Failed to reassign task');
            }
        } catch (error) {
            const anyErr: any = error as any;
            const message = anyErr?.response?.data?.message || anyErr?.message || 'Failed to reassign task';
            toast.error(message);
        }
    }, [tasks, users, currentUser, dispatch]);

    const handleMdImpexReassignTask = useCallback(async (taskId: string, newAssigneeEmail: string) => {
        try {
            const response = await taskService.mdImpexReassignTask(taskId, newAssigneeEmail);
            if (response.success && response.data) {
                dispatch(taskUpserted(response.data as Task));
                return;
            }
            toast.error(response.message || 'Failed to reassign task');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to reassign task');
        }
    }, [dispatch]);

    const handleAddTaskHistory = useCallback(
        async (
            taskId: string,
            history: Omit<TaskHistory, 'id' | 'timestamp'>,
            additionalData?: Record<string, any>
        ) => {
            try {
                const payload = {
                    ...history,
                    additionalData,
                };
                const response = await taskService.addTaskHistory(taskId, payload);
                if (!response.success) {
                    toast.error(response.message || 'Failed to record history');
                    return;
                }
                if (response.data) {
                    const entry: any = response.data;
                    const normalized: TaskHistory = {
                        ...history,
                        id: entry.id || entry._id || `temp-${Date.now()}`,
                        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
                        ...(entry || {}),
                    };
                    dispatch(taskUpserted({
                        ...(tasks.find(t => t.id === taskId) as Task),
                        history: [...((tasks.find(t => t.id === taskId) as any)?.history || []), normalized]
                    } as Task));
                }
                toast.success('History recorded');
            } catch (error) {
                toast.error('Failed to record history');
            }
        },
        [dispatch, tasks]
    );

    const handleApproveTask = useCallback(async (taskId: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }
            if (!hasAccess('task_approval')) {
                toast.error('Only administrators can approve tasks');
                return;
            }
            const updatedTask = {
                ...task,
                completedApproval: !task.completedApproval
            };
            const response = await taskService.updateTask(taskId, {
                completedApproval: !task.completedApproval
            });
            if (response.success) {
                dispatch(taskUpserted(updatedTask as Task));
                toast.success(
                    task.completedApproval
                        ? 'Approval removed'
                        : 'Task approved'
                );
            } else {
                toast.error(response.message || 'Failed to approve task');
            }
        } catch (error) {
            toast.error('Failed to approve task');
        }
    }, [tasks, currentUser, hasAccess, dispatch]);

    const handleUpdateTaskApproval = useCallback(async (taskId: string, completedApproval: boolean) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }
            const isAssigner = task.assignedBy === currentUser.email;
            if (!isAssigner) {
                toast.error('Only the task assigner can permanently approve tasks');
                return;
            }
            const updatedTask = {
                ...task,
                completedApproval: completedApproval
            };
            const response = await taskService.updateTask(taskId, {
                completedApproval: completedApproval
            });
            if (response.success) {
                dispatch(taskUpserted(updatedTask as Task));
                toast.success(
                    completedApproval
                        ? 'Task PERMANENTLY approved by assigner!'
                        : 'Permanent approval removed'
                );
            } else {
                toast.error(response.message || 'Failed to update approval status');
            }
        } catch (error) {
            toast.error('Failed to update approval status');
        }
    }, [tasks, currentUser, hasAccess, dispatch]);

    const handleFetchTaskHistory = useCallback(async (taskId: string): Promise<TaskHistory[]> => {
        try {
            const response = await taskService.getTaskHistory(taskId);
            if (!response.success) {
                toast.error(response.message || 'Failed to fetch history');
                return [];
            }
            return response.data as TaskHistory[];
        } catch (error) {
            toast.error('Failed to load task history');
            return [];
        }
    }, []);

    const handleOpenTaskHistorySidebar = useCallback(async (task: Task) => {
        if (!task?.id) return;
        await handleFetchTaskHistory(String(task.id));
    }, [handleFetchTaskHistory]);

    const getFilteredTasksByStat = useCallback(() => {
        if (!currentUser?.email) return [];
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        const myEmail = (currentUser.email || '').toString().trim().toLowerCase();
        const normalizeTaskTypeKey = (t: any) => String(t?.taskType || t?.type || '').trim().toLowerCase();
        const isOtherWorkTask = (t: any) => normalizeTaskTypeKey(t) === 'other work';
        const normalizeRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        const resolveAssigneeRoleKey = (t: any): string => {
            const direct = normalizeRoleKey((t as any)?.assignedToUser?.role);
            if (direct) return direct;
            const candidate = (t as any)?.assignedToUser || (t as any)?.assignedTo;
            const idOrEmail = typeof candidate === 'string'
                ? candidate
                : (candidate?.id || candidate?._id || candidate?.email || '');
            const key = String(idOrEmail || '').trim().toLowerCase();
            if (!key) return '';
            const found = (usersRef.current || []).find((u: any) => {
                const id = String(u?.id || u?._id || '').trim().toLowerCase();
                const email = String(u?.email || '').trim().toLowerCase();
                return (id && id === key) || (email && email === key);
            });
            return normalizeRoleKey((found as any)?.role);
        };
        const isAssistantAssignee = (t: any): boolean => {
            const r = resolveAssigneeRoleKey(t);
            return r === 'assistant' || r === 'assistance' || r === 'sub_assistance' || r.includes('assistant');
        };
        const isAssignedToMe = (t: any): boolean => {
            const email = String((t as any)?.assignedToUser?.email || (t as any)?.assignedTo || '').trim().toLowerCase();
            return Boolean(myEmail && email && email === myEmail);
        };
        let filtered = tasks.filter((task) => {
            if (role === 'ob_manager') {
                const assignedByMe = String((task as any)?.assignedByUser?.email || (task as any)?.assignedBy || '').trim().toLowerCase() === myEmail;
                return assignedByMe || isAssignedToMe(task) || isAssistantAssignee(task);
            }
            if (role === 'manager' || role === 'marketer_manager') {
                if (isOtherWorkTask(task)) return false;
                const assignedToMe = String(task.assignedTo || '').trim().toLowerCase() === myEmail;
                const assignedByMe = String(task.assignedBy || '').trim().toLowerCase() === myEmail;
                if (assignedByMe) return true;
                if (!assignedToMe) return false;
                return true;
            }
            if (canViewAllTasks || role === 'rm' || role === 'am') return true;
            return task.assignedTo === currentUser.email || task.assignedBy === currentUser.email;
        });
        if (normalizeRoleKey(role) === 'sbm') {
            const selectedRm = String((filters as any)?.rm || '').trim().toLowerCase();
            if (selectedRm && selectedRm !== 'all') {
                const rmTeamRaw = String((filters as any)?.rmTeam || '').trim();
                const list: any[] = Array.isArray(usersRef.current) ? (usersRef.current as any[]) : (users as any[]);
                const selectedRmDoc: any = (list || []).find((u: any) => String(u?.email || '').trim().toLowerCase() === selectedRm);
                const selectedRmId = String(selectedRmDoc?.id || selectedRmDoc?._id || '').trim();
                const teamEmails = rmTeamRaw
                    ? rmTeamRaw
                        .split(',')
                        .map((s) => String(s || '').trim().toLowerCase())
                        .filter(Boolean)
                    : (selectedRmId
                        ? (list || [])
                            .filter((u: any) => String(u?.managerId || '').trim() === selectedRmId)
                            .filter((u: any) => {
                                const r = normalizeRoleKey(u?.role);
                                return r === 'am' || r === 'ar';
                            })
                            .map((u: any) => String(u?.email || '').trim().toLowerCase())
                            .filter(Boolean)
                        : []);
                const getAssignedToEmail = (t: any) => {
                    const assignedTo = (t as any)?.assignedTo;
                    const assignedToUser = (t as any)?.assignedToUser;
                    const email =
                        (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
                        (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
                        (typeof assignedTo === 'string' ? assignedTo : '') ||
                        '';
                    return String(email || '').trim().toLowerCase();
                };
                filtered = filtered.filter((t: any) => {
                    const assignedToEmail = getAssignedToEmail(t);
                    const allowed = Array.from(new Set([
                        selectedRm,
                        ...(teamEmails || []),
                    ].map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)));
                    return Boolean(assignedToEmail && allowed.includes(assignedToEmail));
                });
            }
        }
        if (selectedStatFilter === 'completed') {
            filtered = filtered.filter((task) => task.status === 'completed');
        } else if (selectedStatFilter === 'pending') {
            filtered = filtered.filter((task) => task.status === 'pending' || task.status === 'in-progress' || task.status === 'reassigned');
        } else if (selectedStatFilter === 'overdue') {
            filtered = filtered.filter((task) => task.status !== 'completed' && isOverdueFn(task.dueDate, task.status));
        }
        if (filters.status !== 'all') {
            if (filters.status === 'pending') {
                filtered = filtered.filter((task) => task.status === 'pending' || task.status === 'in-progress' || task.status === 'reassigned');
            } else {
                filtered = filtered.filter((task) => task.status === filters.status);
            }
        }
        if (filters.priority !== 'all') {
            filtered = filtered.filter((task) => task.priority === filters.priority);
        }
        if (filters.taskType !== 'all') {
            const canonicalizeTypeKey = (value: unknown): string => {
                const raw = (value == null ? '' : String(value)).trim();
                if (!raw) return '';
                const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
                if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') return 'troubleshoot';
                return raw.toLowerCase();
            };
            const filterTypeKey = canonicalizeTypeKey(filters.taskType);
            filtered = filtered.filter((task) => {
                const taskTypeKey = canonicalizeTypeKey(task.taskType || (task as any).type || '');
                if (!filterTypeKey || !taskTypeKey) return false;
                return taskTypeKey === filterTypeKey;
            });
        }
        if (filters.company !== 'all') {
            const filterCompanyKey = normalizeCompanyKey(filters.company);
            filtered = filtered.filter((task) => {
                const taskCompany = (task.companyName || (task as any).company || '');
                return normalizeCompanyKey(taskCompany) === filterCompanyKey;
            });
        }
        if (filters.brand !== 'all') {
            const filterBrand = filters.brand.toLowerCase();
            filtered = filtered.filter((task) => {
                const taskBrand = (task.brand || '').toLowerCase();
                return taskBrand === filterBrand;
            });
        }
        if (filters.date === 'today') {
            filtered = filtered.filter((task) => new Date(task.dueDate).toDateString() === new Date().toDateString());
        } else if (filters.date === 'week') {
            filtered = filtered.filter((task) => {
                const taskDate = new Date(task.dueDate);
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return taskDate >= today && taskDate <= nextWeek;
            });
        } else if (filters.date === 'overdue') {
            filtered = filtered.filter((task) => isOverdueFn(task.dueDate, task.status));
        }
        if (filters.assigned) {
            const assignedFilterValue = filters.assigned;
            if (assignedFilterValue === 'assigned-to-me') {
                filtered = filtered.filter((task) => task.assignedTo === currentUser.email);
            } else if (assignedFilterValue === 'assigned-by-me') {
                filtered = filtered.filter((task) => task.assignedBy === currentUser.email);
            } else if (assignedFilterValue.startsWith('assigned-to:')) {
                const assignedToEmail = assignedFilterValue.split(':')[1];
                filtered = filtered.filter((task) => task.assignedTo === assignedToEmail);
            }
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((task) => {
                const title = (task.title || '').toLowerCase();
                const company = (task.companyName || (task as any).company || '').toLowerCase();
                const brand = (task.brand || '').toLowerCase();
                const typeVal = (task.taskType || (task as any).type || '').toLowerCase();
                const assignedToUser = (task as any).assignedToUser;
                const assignedByUser = (task as any).assignedByUser;
                const assignedToEmail = String(
                    assignedToUser?.email ||
                    (typeof (task as any).assignedTo === 'string' ? (task as any).assignedTo : (task as any).assignedTo?.email) ||
                    ''
                ).toLowerCase();
                const assignedToName = String(
                    assignedToUser?.name ||
                    ''
                ).toLowerCase();
                const assignedByEmail = String(
                    assignedByUser?.email ||
                    (typeof (task as any).assignedBy === 'string' ? (task as any).assignedBy : (task as any).assignedBy?.email) ||
                    ''
                ).toLowerCase();
                const assignedByName = String(
                    assignedByUser?.name ||
                    ''
                ).toLowerCase();
                return (
                    title.includes(term) ||
                    company.includes(term) ||
                    brand.includes(term) ||
                    typeVal.includes(term) ||
                    assignedToEmail.includes(term) ||
                    assignedToName.includes(term) ||
                    assignedByEmail.includes(term) ||
                    assignedByName.includes(term)
                );
            });
        }
        return filtered;
    }, [canViewAllTasks, currentUser, filters, isOverdueFn, normalizeCompanyKey, deferredSearchTerm, selectedStatFilter, tasks]);

    const displayTasks = useMemo(() => getFilteredTasksByStat(), [getFilteredTasksByStat]);
    const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200];
    const [tasksPerPage, setTasksPerPage] = useState<number>(10);
    const totalTaskPages = useMemo(() => {
        return Math.max(1, Math.ceil(displayTasks.length / tasksPerPage));
    }, [displayTasks.length, tasksPerPage]);

    useEffect(() => {
        setTaskPage(1);
    }, [
        searchTerm,
        selectedStatFilter,
        filters.status,
        filters.priority,
        filters.assigned,
        filters.date,
        filters.taskType,
        filters.company,
        filters.brand,
        tasksPerPage,
    ]);

    useEffect(() => {
        setTaskPage((prev) => {
            if (prev < 1) return 1;
            if (prev > totalTaskPages) return totalTaskPages;
            return prev;
        });
    }, [totalTaskPages]);

    const taskPageNumbers = useMemo(() => {
        const pages: number[] = [];
        if (totalTaskPages <= 7) {
            for (let i = 1; i <= totalTaskPages; i += 1) pages.push(i);
            return pages;
        }
        const start = Math.max(2, taskPage - 1);
        const end = Math.min(totalTaskPages - 1, taskPage + 1);
        pages.push(1);
        for (let i = start; i <= end; i += 1) pages.push(i);
        pages.push(totalTaskPages);
        return Array.from(new Set(pages));
    }, [taskPage, totalTaskPages]);

    const _showListActionsColumn = useMemo(() => {
        return displayTasks.some((t: Task) => canEditTask(t) || canEditDeleteTask(t));
    }, [displayTasks, canEditTask, canEditDeleteTask]);

    void _showListActionsColumn;

    useMemo(() => {
        if (!currentUser?.email) return [];
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        const myEmail = (currentUser.email || '').toString().trim().toLowerCase();
        const normalizeTaskTypeKey = (t: any) => String(t?.taskType || t?.type || '').trim().toLowerCase();
        const isOtherWorkTask = (t: any) => normalizeTaskTypeKey(t) === 'other work';
        const resolveAssignerRole = (t: any) => String((t as any)?.assignedByUser?.role || (t as any)?.assilgnedBy?.role || '').trim().toLowerCase();
        const normalizeRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        const resolveAssigneeRoleKey = (t: any): string => {
            const direct = normalizeRoleKey((t as any)?.assignedToUser?.role);
            if (direct) return direct;
            const candidate = (t as any)?.assignedToUser || (t as any)?.assignedTo;
            const idOrEmail = typeof candidate === 'string'
                ? candidate
                : (candidate?.id || candidate?._id || candidate?.email || '');
            const key = String(idOrEmail || '').trim().toLowerCase();
            if (!key) return '';
            const found = (usersRef.current || []).find((u: any) => {
                const id = String(u?.id || u?._id || '').trim().toLowerCase();
                const email = String(u?.email || '').trim().toLowerCase();
                return (id && id === key) || (email && email === key);
            });
            return normalizeRoleKey((found as any)?.role);
        };
        const isAssistantAssignee = (t: any): boolean => {
            const r = resolveAssigneeRoleKey(t);
            return r === 'assistant' || r === 'assistance' || r === 'sub_assistance' || r.includes('assistant');
        };
        let filtered = tasks.filter((task) => {
            if (role === 'ob_manager') {
                return isAssistantAssignee(task);
            }
            if (role === 'manager' || role === 'marketer_manager') {
                if (isOtherWorkTask(task)) return false;
                const assignedToMe = String(task.assignedTo || '').trim().toLowerCase() === myEmail;
                const assignedByMe = String(task.assignedBy || '').trim().toLowerCase() === myEmail;
                if (assignedByMe) return true;
                if (!assignedToMe) return false;
                return resolveAssignerRole(task) === 'md_manager';
            }
            if (canViewAllTasks || role === 'rm' || role === 'am') return true;
            return task.assignedTo === currentUser.email || task.assignedBy === currentUser.email;
        });
        if (filters.status !== 'all') {
            filtered = filtered.filter((task) => task.status === filters.status);
        }
        if (filters.priority !== 'all') {
            filtered = filtered.filter((task) => task.priority === filters.priority);
        }
        if (filters.taskType !== 'all') {
            const canonicalizeTypeKey = (value: unknown): string => {
                const raw = (value == null ? '' : String(value)).trim();
                if (!raw) return '';
                const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
                if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') return 'troubleshoot';
                return raw.toLowerCase();
            };
            const filterTypeKey = canonicalizeTypeKey(filters.taskType);
            filtered = filtered.filter((task) => {
                const taskTypeKey = canonicalizeTypeKey(task.taskType || (task as any).type || '');
                if (!filterTypeKey || !taskTypeKey) return false;
                return taskTypeKey === filterTypeKey;
            });
        }
        if (filters.company !== 'all') {
            const filterCompanyKey = normalizeCompanyKey(filters.company);
            filtered = filtered.filter((task) => {
                const taskCompany = (task.companyName || (task as any).company || '');
                return normalizeCompanyKey(taskCompany) === filterCompanyKey;
            });
        }
        if (filters.brand !== 'all') {
            const filterBrand = filters.brand.toLowerCase();
            filtered = filtered.filter((task) => {
                const taskBrand = (task.brand || '').toLowerCase();
                return taskBrand === filterBrand;
            });
        }
        if (filters.date === 'today') {
            filtered = filtered.filter((task) => new Date(task.dueDate).toDateString() === new Date().toDateString());
        } else if (filters.date === 'week') {
            filtered = filtered.filter((task) => {
                const taskDate = new Date(task.dueDate);
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return taskDate >= today && taskDate <= nextWeek;
            });
        } else if (filters.date === 'overdue') {
            filtered = filtered.filter((task) => isOverdueFn(task.dueDate, task.status));
        }
        if (filters.assigned === 'assigned-to-me') {
            filtered = filtered.filter((task) => task.assignedTo === currentUser.email);
        } else if (filters.assigned === 'assigned-by-me') {
            filtered = filtered.filter((task) => task.assignedBy === currentUser.email);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((task) => {
                const title = (task.title || '').toLowerCase();
                const company = (task.companyName || (task as any).company || '').toLowerCase();
                const brand = (task.brand || '').toLowerCase();
                const typeVal = (task.taskType || (task as any).type || '').toLowerCase();
                return title.includes(term) || company.includes(term) || brand.includes(term) || typeVal.includes(term);
            });
        }
        return filtered;
    }, [canViewAllTasks, currentUser, filters, isOverdueFn, normalizeCompanyKey, normalizeRoleKey, deferredSearchTerm, tasks, usersRef]);

    const stats: StatMeta[] = useMemo(() => {
        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
        const myEmail = (currentUser.email || '').toString().trim().toLowerCase();
        const normalizeRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        let filtered = tasks.filter((task) => {
            if (role === 'ob_manager') {
                const assignedByMe = String((task as any)?.assignedByUser?.email || (task as any)?.assignedBy || '').trim().toLowerCase() === myEmail;
                const assignedToMe = String((task as any)?.assignedToUser?.email || (task as any)?.assignedTo || '').trim().toLowerCase() === myEmail;
                const normalizeTaskTypeKey = (t: any) => String(t?.taskType || t?.type || '').trim().toLowerCase();
                (t: any) => normalizeTaskTypeKey(t) === 'other work';
                const resolveAssigneeRoleKey = (t: any): string => {
                    const direct = normalizeRoleKey((t as any)?.assignedToUser?.role);
                    if (direct) return direct;
                    const candidate = (t as any)?.assignedToUser || (t as any)?.assignedTo;
                    const idOrEmail = typeof candidate === 'string' ? candidate : (candidate?.id || candidate?._id || candidate?.email || '');
                    const key = String(idOrEmail || '').trim().toLowerCase();
                    if (!key) return '';
                    const found = (usersRef.current || []).find((u: any) => {
                        const id = String(u?.id || u?._id || '').trim().toLowerCase();
                        const email = String(u?.email || '').trim().toLowerCase();
                        return (id && id === key) || (email && email === key);
                    });
                    return normalizeRoleKey((found as any)?.role);
                };
                const isAssistantAssignee = (t: any): boolean => {
                    const r = resolveAssigneeRoleKey(t);
                    return r === 'assistant' || r === 'assistance' || r === 'sub_assistance' || r.includes('assistant');
                };
                return assignedByMe || assignedToMe || isAssistantAssignee(task);
            }
            if (role === 'manager' || role === 'marketer_manager') {
                const normalizeTaskTypeKey = (t: any) => String(t?.taskType || t?.type || '').trim().toLowerCase();
                const isOtherWorkTask = (t: any) => normalizeTaskTypeKey(t) === 'other work';
                if (isOtherWorkTask(task)) return false;
                const assignedToMe = String(task.assignedTo || '').trim().toLowerCase() === myEmail;
                const assignedByMe = String(task.assignedBy || '').trim().toLowerCase() === myEmail;
                if (assignedByMe) return true;
                if (!assignedToMe) return false;
                const resolveAssignerRole = (t: any) => String((t as any)?.assignedByUser?.role || (t as any)?.assignedBy?.role || '').trim().toLowerCase();
                return resolveAssignerRole(task) === 'md_manager';
            }
            if (canViewAllTasks || role === 'rm' || role === 'am') return true;
            return task.assignedTo === currentUser.email || task.assignedBy === currentUser.email;
        });
        if (normalizeRoleKey(role) === 'sbm') {
            const selectedRm = String((filters as any)?.rm || '').trim().toLowerCase();
            if (selectedRm && selectedRm !== 'all') {
                const list: any[] = Array.isArray(usersRef.current) ? (usersRef.current as any[]) : (users as any[]);
                const selectedRmDoc: any = (list || []).find((u: any) => String(u?.email || '').trim().toLowerCase() === selectedRm);
                const selectedRmId = String(selectedRmDoc?.id || selectedRmDoc?._id || '').trim();
                const teamEmails = selectedRmId
                    ? (list || [])
                        .filter((u: any) => String(u?.managerId || '').trim() === selectedRmId)
                        .filter((u: any) => {
                            const r = normalizeRoleKey(u?.role);
                            return r === 'am' || r === 'ar';
                        })
                        .map((u: any) => String(u?.email || '').trim().toLowerCase())
                        .filter(Boolean)
                    : [];
                const getAssignedByEmail = (t: any) => {
                    const assignedBy = (t as any)?.assignedBy;
                    const assignedByUser = (t as any)?.assignedByUser;
                    const email =
                        (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
                        (typeof assignedByUser === 'string' && assignedByUser.includes('@') ? assignedByUser : assignedByUser?.email) ||
                        (typeof assignedBy === 'string' ? assignedBy : '') ||
                        '';
                    return String(email || '').trim().toLowerCase();
                };
                const getAssignedToEmail = (t: any) => {
                    const assignedTo = (t as any)?.assignedTo;
                    const assignedToUser = (t as any)?.assignedToUser;
                    const email =
                        (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
                        (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
                        (typeof assignedTo === 'string' ? assignedTo : '') ||
                        '';
                    return String(email || '').trim().toLowerCase();
                };
                filtered = filtered.filter((t: any) => {
                    const assignedByEmail = getAssignedByEmail(t);
                    if (!assignedByEmail || assignedByEmail !== selectedRm) return false;
                    const assignedToEmail = getAssignedToEmail(t);
                    const isToMe = Boolean(myEmail && assignedToEmail && assignedToEmail === myEmail);
                    const isToTeam = Boolean(assignedToEmail && teamEmails.includes(assignedToEmail));
                    return isToMe || isToTeam;
                });
            }
        }
        if (filters.status !== 'all') {
            if (filters.status === 'pending') {
                filtered = filtered.filter((task) => task.status === 'pending' || task.status === 'in-progress' || task.status === 'reassigned');
            } else {
                filtered = filtered.filter((task) => task.status === filters.status);
            }
        }
        if (filters.priority !== 'all') {
            filtered = filtered.filter((task) => task.priority === filters.priority);
        }
        if (filters.taskType !== 'all') {
            const canonicalizeTypeKey = (value: unknown): string => {
                const raw = (value == null ? '' : String(value)).trim();
                if (!raw) return '';
                const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
                if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') return 'troubleshoot';
                return raw.toLowerCase();
            };
            const filterTypeKey = canonicalizeTypeKey(filters.taskType);
            filtered = filtered.filter((task) => {
                const taskTypeKey = canonicalizeTypeKey(task.taskType || (task as any).type || '');
                if (!filterTypeKey || !taskTypeKey) return false;
                return taskTypeKey === filterTypeKey;
            });
        }
        if (filters.company !== 'all') {
            const filterCompanyKey = normalizeCompanyKey(filters.company);
            filtered = filtered.filter((task) => {
                const taskCompany = (task.companyName || (task as any).company || '');
                return normalizeCompanyKey(taskCompany) === filterCompanyKey;
            });
        }
        if (filters.brand !== 'all') {
            const filterBrand = filters.brand.toLowerCase();
            filtered = filtered.filter((task) => {
                const taskBrand = (task.brand || '').toLowerCase();
                return taskBrand === filterBrand;
            });
        }
        if (filters.date === 'today') {
            filtered = filtered.filter((task) => new Date(task.dueDate).toDateString() === new Date().toDateString());
        } else if (filters.date === 'week') {
            filtered = filtered.filter((task) => {
                const taskDate = new Date(task.dueDate);
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return taskDate >= today && taskDate <= nextWeek;
            });
        } else if (filters.date === 'overdue') {
            filtered = filtered.filter((task) => isOverdueFn(task.dueDate, task.status));
        }
        if (filters.assigned === 'assigned-to-me') {
            filtered = filtered.filter((task) => task.assignedTo === currentUser.email);
        } else if (filters.assigned === 'assigned-by-me') {
            filtered = filtered.filter((task) => task.assignedBy === currentUser.email);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((task) => {
                const title = (task.title || '').toLowerCase();
                const company = (task.companyName || (task as any).company || '').toLowerCase();
                const brand = (task.brand || '').toLowerCase();
                const typeVal = (task.taskType || (task as any).type || '').toLowerCase();
                const assignedToUser = (task as any).assignedToUser;
                const assignedByUser = (task as any).assignedByUser;
                const assignedToEmail = String(
                    assignedToUser?.email ||
                    (typeof (task as any).assignedTo === 'string' ? (task as any).assignedTo : (task as any).assignedTo?.email) ||
                    ''
                ).toLowerCase();
                const assignedToName = String(
                    assignedToUser?.name ||
                    ''
                ).toLowerCase();
                const assignedByEmail = String(
                    assignedByUser?.email ||
                    (typeof (task as any).assignedBy === 'string' ? (task as any).assignedBy : (task as any).assignedBy?.email) ||
                    ''
                ).toLowerCase();
                const assignedByName = String(
                    assignedByUser?.name ||
                    ''
                ).toLowerCase();
                return (
                    title.includes(term) ||
                    company.includes(term) ||
                    brand.includes(term) ||
                    typeVal.includes(term) ||
                    assignedToEmail.includes(term) ||
                    assignedToName.includes(term) ||
                    assignedByEmail.includes(term) ||
                    assignedByName.includes(term)
                );
            });
        }
        const completedTasks = filtered.filter((t) => t.status === 'completed');
        const pendingTasks = filtered.filter((t) => t.status !== 'completed');
        const overdueTasks = filtered.filter((t) => t.status !== 'completed' && isOverdueFn(t.dueDate, t.status));
        return [
            {
                name: 'Total Tasks',
                value: filtered.length,
                change: '',

                changeType: 'positive',
                icon: BarChart3,
                id: 'total',
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
            },
            {
                name: 'Completed',
                value: completedTasks.length,
                change: '',

                changeType: 'positive',
                icon: CheckCircle,
                id: 'completed',
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
            },
            {
                name: 'Pending',
                value: pendingTasks.length,
                change: '',

                changeType: 'negative',
                icon: Clock,
                id: 'pending',
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
            },
            {
                name: 'Overdue',
                value: overdueTasks.length,
                change: '',

                changeType: 'negative',
                icon: AlertCircle,
                id: 'overdue',
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
            }
        ];
    }, [canViewAllTasks, currentUser, filters, isOverdueFn, normalizeCompanyKey, normalizeRoleKey, deferredSearchTerm, tasks, usersRef]);
    const getActiveFilterCount = useCallback(() => {
        let count = 0;
        const isCompanyForced = (availableCompanies || []).length === 1;
        Object.entries(filters).forEach(([key, value]) => {
            if (key === 'brand' || key === 'sort') return;
            if (key === 'company' && isCompanyForced) return;
            if (value !== 'all' && value !== '') count++;
        });
        return count;
    }, [availableCompanies, filters]);

    const handleStatClick = useCallback((statId: string) => {
        setTaskPage(1);
        setSelectedStatFilter(statId);
    }, []);

    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setTaskPage(1);
        setFilters(prev => {
            const next = {
                ...prev,
                [filterType]: value,
            };
            if (filterType === 'company') {
                next.brand = 'all';
                next.taskType = 'all';
            }
            return next;
        });
    }, []);

    const handleAdvancedFilterChange = useCallback((filterType: string, value: string) => {
        setTaskPage(1);
        setFilters(prev => {
            const next = {
                ...prev,
                [filterType]: value,
            };
            if (filterType === 'company') {
                next.brand = 'all';
                next.taskType = 'all';
            }
            return next;
        });
    }, []);

    const resetFilters = useCallback(() => {
        setTaskPage(1);
        setFilters({
            status: 'all',
            priority: 'all',
            assigned: 'all',
            date: 'all',
            taskType: 'all',
            company: 'all',
            brand: 'all',
            rm: 'all',
            sort: 'desc',
        });
        setSelectedStatFilter('all');
        setSearchTerm('');
    }, []);

    const handleInputChange = useCallback((field: keyof NewTaskForm, value: string) => {
        setNewTask(prev => {
            const next: any = {
                ...prev,
                [field]: value,
            };
            if (field === 'assignedTo') {
                const emailKey = (value || '').toString().trim().toLowerCase();
                const userDoc: any = (usersRef.current || []).find((u: any) => {
                    const uEmail = (u?.email || '').toString().trim().toLowerCase();
                    return uEmail && uEmail === emailKey;
                });
                const userCompany = (userDoc?.companyName || userDoc?.company || '').toString().trim();
                if (userCompany && userCompany !== (next.companyName || '').toString().trim()) {
                    next.companyName = userCompany;
                    next.brand = '';
                    next.taskType = '';
                }
            }
            if (field === 'companyName') {
                next.brand = '';
                next.taskType = '';
            }
            return next as NewTaskForm;
        });
        if (formErrors[field]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [formErrors]);

    useEffect(() => {
        const company = (newTask.companyName || '').toString().trim();
        if (!company) return;
        const options = Array.isArray(availableTaskTypesForNewTask) ? availableTaskTypesForNewTask : [];
        if (options.length === 0) return;
        const current = (newTask.taskType || '').toString().trim().toLowerCase();
        const normalizedOptions = options.map((x) => (x || '').toString().trim().toLowerCase()).filter(Boolean);
        if (current && normalizedOptions.includes(current)) return;
        setNewTask((prev) => {
            const curr = (prev?.taskType || '').toString().trim().toLowerCase();
            if (curr && normalizedOptions.includes(curr)) return prev;
            return { ...prev, taskType: normalizedOptions[0] };
        });
    }, [availableTaskTypesForNewTask, newTask.companyName, newTask.taskType]);

    const handleAddTaskTypeClick = useCallback(async () => {
        if (canBulkAddTaskTypes) {
            if (!bulkTaskTypeCompany) {
                setBulkTaskTypeCompany(newTask.companyName || '');
            }
            setShowBulkTaskTypeModal(true);
            return;
        }
        if (!newTask.companyName) {
            toast.error('Please select a company first');
            return;
        }
        const raw = window.prompt('Enter task type');
        const name = (raw || '').toString().trim();
        if (!name) return;
        try {
            const res = await taskTypeService.createTaskType({ name, companyName: newTask.companyName });
            if (res.success && res.data) {
                setTaskTypes(prev => {
                    const list = Array.isArray(prev) ? prev : [];
                    const exists = list.some(t => (t?.name || '').toString().trim().toLowerCase() === (res.data.name || '').toString().trim().toLowerCase());
                    if (exists) return list;
                    return [...list, res.data];
                });
                await addTaskTypesToCompany(newTask.companyName, [res.data.name]);
                handleInputChange('taskType', res.data.name.toLowerCase());
            }
        } catch (error) {
            // ignore
        }
    }, [addTaskTypesToCompany, bulkTaskTypeCompany, canBulkAddTaskTypes, handleInputChange, newTask.companyName]);

    const handleAddCompanyClick = useCallback(async () => {
        if (canBulkAddCompanies) {
            setShowBulkCompanyModal(true);
            return;
        }
        const raw = window.prompt('Enter company name');
        const name = (raw || '').toString().trim();
        if (!name) return;
        try {
            const res = await companyService.createCompany({ name });
            if (res.success && res.data) {
                setCompanies(prev => {
                    const list = Array.isArray(prev) ? prev : [];
                    const exists = list.some(c => (c?.name || '').toString().trim().toLowerCase() === (res.data.name || '').toString().trim().toLowerCase());
                    if (exists) return list;
                    return [...list, res.data];
                });
                companiesFetchedAtRef.current = Date.now();
                handleInputChange('companyName', res.data.name);
            }
        } catch (error) {
            // ignore
        }
    }, [canBulkAddCompanies, handleInputChange]);

    const handleAddBrandClick = useCallback(async () => {
        if (canBulkAddBrands) {
            setShowBulkBrandModal(true);
            return;
        }
        if (!canCreateBrand) {
            toast.error('Access denied');
            return;
        }
        if (!newTask.companyName) {
            toast.error('Please select a company first');
            return;
        }
        setManagerBrandName('');
        setShowManagerAddBrandModal(true);
    }, [canBulkAddBrands, canCreateBrand, newTask.companyName]);

    const handleSubmitBulkBrands = useCallback(async () => {
        if (!canBulkAddBrands) {
            toast.error('Access denied');
            return;
        }
        if (!bulkBrandForm.company) {
            toast.error('Please select a company');
            return;
        }
        const companyName = (bulkBrandForm.company || '').toString().trim();
        const companyKey = companyName.toLowerCase().replace(/\s+/g, '');
        const isSpeedEcomCompany = companyKey === 'speedecom';
        const splitLines = (text: string) => (text || '').split(/\r?\n/).map((l) => l.trim());
        const trimEndEmpty = (list: string[]) => {
            let end = list.length;
            while (end > 0 && !list[end - 1]) end -= 1;
            return list.slice(0, end);
        };
        const requestedBrands = isSpeedEcomCompany
            ? (() => {
                const groupNumbers = trimEndEmpty(splitLines((bulkBrandForm.groupNumber || '') as string));
                const brandNames = trimEndEmpty(splitLines((bulkBrandForm.groupName || '') as string));
                if (groupNumbers.length === 0 || brandNames.length === 0) {
                    toast.error('Please paste group numbers and brand names');
                    return [] as Array<{ brandName: string; groupNumber: string }>;
                }
                if (groupNumbers.length !== brandNames.length) {
                    toast.error('Group Numbers and Brand Names rows count must match');
                    return [] as Array<{ brandName: string; groupNumber: string }>;
                }
                const rows: Array<{ brandName: string; groupNumber: string }> = [];
                for (let i = 0; i < brandNames.length; i += 1) {
                    const groupNumber = groupNumbers[i] || '';
                    const brandName = brandNames[i] || '';
                    if (!groupNumber && !brandName) continue;
                    if (!groupNumber || !brandName) {
                        toast.error(`Row ${i + 1}: Group Number and Brand Name are required`);
                        return [];
                    }
                    rows.push({ brandName, groupNumber });
                }
                return rows;
            })()
            : (() => {
                const raw = (bulkBrandForm.brandNames || '').trim();
                if (!raw) {
                    toast.error('Please enter brand names');
                    return [] as Array<{ brandName: string; groupNumber: string }>;
                }
                return raw
                    .split(/\r?\n|,/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((name) => ({ brandName: name, groupNumber: '' }));
            })();
        if (requestedBrands.length === 0) return;
        setIsCreatingBulkBrands(true);
        try {
            const chunkSize = 50;
            const chunk = <T,>(list: T[], size: number): T[][] => {
                const out: T[][] = [];
                for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
                return out;
            };
            const brandPayload = requestedBrands.map((row: any) => ({
                name: row.brandName,
                company: companyName,
                status: 'active',
                ...(isSpeedEcomCompany
                    ? {
                        groupNumber: row.groupNumber,
                        groupName: row.brandName,
                        rmEmail: bulkBrandForm.rmEmail,
                        amEmail: bulkBrandForm.amEmail,
                    }
                    : {}),
            }));
            const batches = chunk(brandPayload, chunkSize);
            const createdBrandsAll: any[] = [];
            const assignmentMetaAgg = {
                rmAmEmailCount: 0,
                rmAmUsersFound: 0,
                assignedBrandIdsOps: 0,
                mappingOps: 0,
            };
            for (let i = 0; i < batches.length; i += 1) {
                const res = await brandService.bulkUpsertBrands(
                    { brands: batches[i] as any },
                    { timeout: 300000 }
                );
                if (!res?.success) {
                    throw new Error('Failed to add brands');
                }
                if (Array.isArray((res as any).data)) {
                    createdBrandsAll.push(...((res as any).data || []));
                }
                const meta = (res as any)?.meta?.assignment;
                if (meta) {
                    assignmentMetaAgg.rmAmEmailCount = Math.max(assignmentMetaAgg.rmAmEmailCount, Number(meta.rmAmEmailCount || 0));
                    assignmentMetaAgg.rmAmUsersFound = Math.max(assignmentMetaAgg.rmAmUsersFound, Number(meta.rmAmUsersFound || 0));
                    assignmentMetaAgg.assignedBrandIdsOps += Number(meta.assignedBrandIdsOps || 0);
                    assignmentMetaAgg.mappingOps += Number(meta.mappingOps || 0);
                }
            }
            const res = { success: true, data: createdBrandsAll, meta: { assignment: assignmentMetaAgg } } as any;
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                if (isSpeedEcomCompany && (bulkBrandForm.rmEmail || bulkBrandForm.amEmail)) {
                    const backendDidAssignment = Boolean((res as any)?.meta?.assignment?.mappingOps);
                    if (backendDidAssignment) {
                        try {
                            const event = new CustomEvent('assignmentsApplied', {
                                detail: {
                                    companyName,
                                    userId: '',
                                    brandIds: (res.data || []).map((b: any) => (b?.id || b?._id || '').toString()).filter(Boolean),
                                    taskTypeIds: [],
                                },
                            });
                            window.dispatchEvent(event);
                        } catch {
                            // ignore
                        }
                        toast.success('Assigned to selected RM/AM');
                    }
                    if (!backendDidAssignment) {
                        toast.success('Brands added. Assignment is processing on server.');
                    }
                }
                dispatch(brandsSetAll([...apiBrands, ...res.data] as Brand[]));
                setBulkBrandForm({ company: '', brandNames: '', groupNumber: '', groupName: '', rmEmail: '', amEmail: '' });
                setShowBulkBrandModal(false);
                const event = new CustomEvent('brandUpdated', { detail: { brands: res.data } });
                window.dispatchEvent(event);
                toast.success(`${res.data.length} brand(s) processed successfully!`);
            } else {
                toast.error('Failed to add brands');
            }
        } catch (err) {
            toast.error('Failed to add brands');
        } finally {
            setIsCreatingBulkBrands(false);
        }
    }, [bulkBrandForm, canBulkAddBrands, companyUsers, normalizeText, taskTypes]);

    const handleSubmitBulkCompanies = useCallback(async () => {
        if (!canBulkAddCompanies) {
            toast.error('Access denied');
            return;
        }
        if (!bulkCompanyNames.trim()) {
            toast.error('Please enter company names');
            return;
        }
        const requested = bulkCompanyNames
            .split(/\r?\n|,/)
            .map(s => s.trim())
            .filter(Boolean);
        if (requested.length === 0) {
            toast.error('No valid company names provided');
            return;
        }
        setIsCreatingBulkCompanies(true);
        try {
            const res = await companyService.bulkUpsertCompanies({
                companies: requested.map(name => ({ name }))
            });
            if (res.success && res.data) {
                setCompanies(res.data as any);
                companiesFetchedAtRef.current = Date.now();
                setBulkCompanyNames('');
                setShowBulkCompanyModal(false);
                toast.success(`${res.data.length} company(ies) processed successfully!`);
            } else {
                toast.error('Failed to add companies');
            }
        } catch (err) {
            toast.error('Failed to add companies');
        } finally {
            setIsCreatingBulkCompanies(false);
        }
    }, [bulkCompanyNames, canBulkAddCompanies]);

    const handleSubmitBulkTaskTypes = useCallback(async () => {
        if (!canBulkAddTaskTypes) {
            toast.error('Access denied');
            return;
        }
        if (!bulkTaskTypeCompany) {
            toast.error('Please select a company');
            return;
        }
        if (!bulkTaskTypeNames.trim()) {
            toast.error('Please enter task types');
            return;
        }
        const requested = bulkTaskTypeNames
            .split(/\r?\n|,/)
            .map(s => s.trim())
            .filter(Boolean);
        if (requested.length === 0) {
            toast.error('No valid task types provided');
            return;
        }
        setIsCreatingBulkTaskTypes(true);
        try {
            const res = await taskTypeService.bulkUpsertTaskTypes({
                types: requested.map(name => ({ name })),
                companyName: bulkTaskTypeCompany
            });
            if (res.success && res.data) {
                await addTaskTypesToCompany(bulkTaskTypeCompany, requested);
                setTaskTypes(res.data as any);
                setBulkTaskTypeNames('');
                setShowBulkTaskTypeModal(false);
                setBulkTaskTypeCompany('');
                toast.success(`${res.data.length} task type(s) processed successfully!`);
            } else {
                toast.error('Failed to add task types');
            }
        } catch (err) {
            toast.error('Failed to add task types');
        } finally {
            setIsCreatingBulkTaskTypes(false);
        }
    }, [addTaskTypesToCompany, bulkTaskTypeCompany, bulkTaskTypeNames, canBulkAddTaskTypes]);

    const handleEditInputChange = useCallback((field: keyof EditTaskForm, value: string) => {
        setEditFormData(prev => {
            const nextState = {
                ...prev,
                [field]: value,
            };
            if (field === 'companyName') {
                nextState.brand = '';
                nextState.taskType = '';
            }
            return nextState;
        });

        if (editFormErrors[field]) {
            setEditFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [editFormErrors]);

    const validateForm = useCallback((formToValidate: NewTaskForm = newTask) => {
        const errors: Record<string, string> = {};
        if (!formToValidate.title.trim()) {
            errors.title = 'Title is required';
        }
        if (!formToValidate.assignedTo) {
            errors.assignedTo = 'Please assign the task to a user';
        }
        if (!formToValidate.dueDate) {
            errors.dueDate = 'Due date is required';
        } else {
            const selectedDate = new Date(formToValidate.dueDate);
            const today = new Date();
            selectedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (!isSpeedEcomUser && selectedDate < yesterday) {
                errors.dueDate = 'Due date cannot be in the past';
            }
        }
        if (!newTask.companyName || newTask.companyName.trim() === '') {
            errors.companyName = 'Company is required';
        }
        if (!newTask.brand || newTask.brand.trim() === '') {
            errors.brand = 'Brand is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [isSpeedEcomUser, newTask]);

    const validateEditForm = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!editFormData.title.trim()) {
            errors.title = 'Title is required';
        }
        if (!editFormData.assignedTo) {
            errors.assignedTo = 'Please assign the task to a user';
        }
        if (!editFormData.dueDate) {
            errors.dueDate = 'Due date is required';
        } else {
            const selectedDate = new Date(editFormData.dueDate);
            const today = new Date();
            selectedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (selectedDate < oneYearAgo) {
                errors.dueDate = 'Due date cannot be more than 1 year in the past';
            }
        }
        setEditFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [editFormData]);

    const fetchTasks = useCallback(async (options?: { force?: boolean }) => {
        try {
            const isInitialFetch = !hasFetchedTasksOnceRef.current && tasks.length === 0;
            if (isInitialFetch) setLoading(true);
            const action = await dispatch(
                fetchTasksThunk(options?.force ? { force: true } : undefined)
            );
            const incoming = fetchTasksThunk.fulfilled.match(action)
                ? action.payload
                : (action as any)?.meta?.condition
                    ? tasks
                    : null;
            if (Array.isArray(incoming)) {
                const getTaskId = (t: any): string => {
                    return (t?.id || t?._id || '').toString();
                };
                const normalizeEmail = (v: any): string => {
                    if (!v) return '';
                    if (typeof v === 'string') return v;
                    if (typeof v === 'object' && v !== null) return v.email || v.name || '';
                    return '';
                };
                const myEmail = (currentUserEmailRef.current || '').toLowerCase();
                const getSeenStorageKey = (email: string) => `seenTaskIds:${email}`;
                const readSeenFromStorage = (email: string): Set<string> => {
                    try {
                        const raw = localStorage.getItem(getSeenStorageKey(email));
                        if (!raw) return new Set();
                        const parsed = JSON.parse(raw);
                        if (!Array.isArray(parsed)) return new Set();
                        return new Set(parsed.map((x) => (x == null ? '' : String(x))).filter(Boolean));
                    } catch {
                        return new Set();
                    }
                };
                const writeSeenToStorage = (email: string, ids: Set<string>) => {
                    try {
                        localStorage.setItem(getSeenStorageKey(email), JSON.stringify(Array.from(ids)));
                    } catch {
                        return;
                    }
                };
                const previousSeenIds = myEmail ? readSeenFromStorage(myEmail) : new Set<string>();
                const canDetectNewTasks = Boolean(myEmail) && previousSeenIds.size > 0;
                if (canDetectNewTasks) {
                    const getAssignerName = (task: Task): string => {
                        const direct = (task as any)?.assignedByName;
                        if (direct) return direct;
                        const assignedByUser: any = (task as any)?.assignedByUser;
                        if (assignedByUser && typeof assignedByUser === 'object') {
                            return assignedByUser.name || assignedByUser.email || 'User';
                        }
                        const assignedBy: any = (task as any)?.assignedBy;
                        if (assignedBy && typeof assignedBy === 'object') {
                            return assignedBy.name || assignedBy.email || 'User';
                        }
                        if (typeof assignedBy === 'string' && assignedBy) {
                            const match = (usersRef.current || []).find(u => (u?.email || '').toLowerCase() === assignedBy.toLowerCase());
                            return match?.name || assignedBy.split('@')[0] || assignedBy;
                        }
                        return 'User';
                    };
                    const newAssignedTasks = incoming.filter(t => {
                        const id = getTaskId(t);
                        if (!id || previousSeenIds.has(id)) return false;
                        const assignedToEmail = (
                            normalizeEmail((t as any)?.assignedTo) ||
                            normalizeEmail((t as any)?.assignedToUser?.email) ||
                            normalizeEmail((t as any)?.assignedToUser)
                        ).toLowerCase();
                        const assignedByEmail = (
                            normalizeEmail((t as any)?.assignedBy) ||
                            normalizeEmail((t as any)?.assignedByUser?.email) ||
                            normalizeEmail((t as any)?.assignedByUser)
                        ).toLowerCase();
                        if (assignedByEmail && assignedByEmail === myEmail) return false;
                        return assignedToEmail === myEmail;
                    });
                    newAssignedTasks.forEach(t => {
                        toast.success(`New task assigned by ${getAssignerName(t)}`);
                    });
                }
                if (myEmail) {
                    const nextIds = new Set<string>();
                    incoming.forEach(t => {
                        const id = getTaskId(t);
                        if (id) nextIds.add(id);
                    });
                    seenTaskIdsRef.current = nextIds;
                    hasFetchedTasksOnceRef.current = true;
                    writeSeenToStorage(myEmail, nextIds);
                }
            } else {
                toast.error('Failed to fetch tasks');
            }
        } catch (error) {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [dispatch, tasks]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await authService.getAllUsers();
            if (!response) return;
            let rawUsers: any[] = [];
            if (Array.isArray(response)) {
                rawUsers = response;
            } else if (Array.isArray((response as any).data)) {
                rawUsers = (response as any).data;
            } else if (Array.isArray((response as any).result)) {
                rawUsers = (response as any).result;
            } else if ((response as any).success && Array.isArray((response as any).data)) {
                rawUsers = (response as any).data;
            }
            if (!rawUsers.length) return;
            const normalizedUsers = rawUsers.map((user: any) => {
                const id = user.id || user._id || user.userId || user.userid || '';
                return {
                    ...user,
                    id,
                } as UserType;
            });
            const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
            const isMdImpexUser = currentUserCompany.includes('mdimpex') || currentUserCompany.includes('md_impex');
            if (isMdImpexUser) {
                setAllMdImpexUsers(normalizedUsers);
            }
            dispatch(usersSetAll(normalizedUsers));
            usersFetchedAtRef.current = Date.now();
            try {
                localStorage.setItem('users_cache', JSON.stringify(normalizedUsers));
            } catch {
                // ignore
            }
        } catch (error) {
            // ignore
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        const fetchMdAccess = async () => {
            const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
            const isMdImpexUser = currentUserCompany.includes('mdimpex') || currentUserCompany.includes('md_impex');
            if (!isMdImpexUser || !((currentUser as any)?.email)) return;

            try {
                const [membersRes, accessRes] = await Promise.all([
                    mdImpexAccessService.getAllMembers(),
                    mdImpexAccessService.getAllPersonAccess(),
                ]);

                if (!mounted) return;

                if (membersRes?.success && membersRes.data) {
                    const allMembers = (membersRes.data || []).map((m: any) => ({
                        id: String(m.id || m._id || ''),
                        email: String(m.email || '').trim(),
                        name: String(m.name || '').trim(),
                        role: String(m.role || '').trim(),
                    }));

                    const currentNormalized = String((currentUser as any)?.email || '').trim().toLowerCase();
                    const accessList = (accessRes?.success && accessRes.data) ? accessRes.data : [];
                    const myAccess = accessList.find((item: any) => String(item.assignedToEmail || '').trim().toLowerCase() === currentNormalized);

                    const myInfo = allMembers.find((m: any) => String(m.email || '').trim().toLowerCase() === currentNormalized);
                    const myRoleNormalized = String(myInfo?.role || '').trim().toLowerCase().replace(/\s+/g, '_');
                    const isAdmin = ['admin', 'super_admin', 'troubleshoot_manager'].includes(String((currentUser as any)?.role || '').trim().toLowerCase());

                    if (myRoleNormalized === 'md_manager' || isAdmin) {
                        let members: any[] = [];
                        if (myAccess && myAccess.allowedAssignees && myAccess.allowedAssignees.length > 0) {
                            const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
                            members = allMembers.filter((m: any) => allowedIds.has(String(m.id)) || String(m.email || '').trim().toLowerCase() === currentNormalized);
                        } else {
                            members = allMembers;
                        }

                        setMdAllowedMembers(members.map((m: any) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'user' })));
                        setMdAllowedTaskTypes(myAccess?.allowedTaskTypes || []);
                        setMdAllowedBrands(myAccess?.allowedBrands || []);
                    } else if (myAccess) {
                        const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
                        const filteredMembers = allMembers.filter((m: any) => allowedIds.has(String(m.id)) || String(m.email || '').trim().toLowerCase() === currentNormalized);
                        const members = filteredMembers.map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
                        setMdAllowedMembers(members.map((m: any) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'user' })));
                        setMdAllowedTaskTypes(myAccess.allowedTaskTypes || []);
                        setMdAllowedBrands(myAccess.allowedBrands || []);
                    } else {
                        const me = allMembers.filter((m: any) => String(m.email || '').trim().toLowerCase() === currentNormalized).map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
                        setMdAllowedMembers(me.map((m: any) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'user' })));
                        setMdAllowedTaskTypes([]);
                        setMdAllowedBrands([]);
                    }
                }
            } catch (err) {
                console.error('❌ [Dashboard] MD Impex access fetch error:', err);
            }
        };

        void fetchMdAccess();
        return () => { mounted = false; };
    }, [currentUser]);

    const fetchBrands = useCallback(async () => {
        try {
            const role = (currentUser?.role || '').toString().trim().toLowerCase();
            const shouldFetchAllBrands = role === 'admin' || role === 'super_admin' || role === 'troubleshoot_manager' || role === 'md_manager' || role === 'manager' || role === 'ob_manager' || role === 'marketer_manager' || role === 'all_manager';
            const response = shouldFetchAllBrands
                ? await brandService.getBrands({ includeDeleted: true })
                : await brandService.getAssignedBrands();
            if (response && response.success && Array.isArray(response.data)) {
                dispatch(brandsSetAll(response.data as Brand[]));
                brandsFetchedAtRef.current = Date.now();
                try {
                    localStorage.setItem('apiBrands_cache', JSON.stringify(response.data));
                } catch {
                    // ignore
                }
            }
        } catch (error) {
            // ignore
        }
    }, [currentUser?.role]);

    const fetchCompanies = useCallback(async () => {
        try {
            const role = (currentUser?.role || '').toString().trim().toLowerCase();
            const needsAllowedCompanies =
                role === 'md_manager' ||
                role === 'manager' || role === 'marketer_manager' ||
                role === 'assistant' ||
                role === 'ob_manager' ||
                role === 'sbm';
            const response = needsAllowedCompanies
                ? await companyService.getAllowedCompanies()
                : await companyService.getCompanies();
            if (response && response.success && Array.isArray(response.data)) {
                setCompanies(response.data as Company[]);
                companiesFetchedAtRef.current = Date.now();
            }
        } catch (error) {
            // ignore
        }
    }, [currentUser?.role]);

    const fetchTaskTypes = useCallback(async () => {
        try {
            const response = await taskTypeService.getTaskTypes();
            if (response && response.success && Array.isArray(response.data)) {
                setTaskTypes(response.data as TaskTypeItem[]);
                taskTypesFetchedAtRef.current = Date.now();
            }
        } catch (error) {
            // ignore
        }
    }, []);

    const ensureUsersLoaded = useCallback(async (opts?: { force?: boolean }) => {
        const force = Boolean(opts?.force);
        const isFresh = usersFetchedAtRef.current && Date.now() - usersFetchedAtRef.current < SUPPORTING_FETCH_TTL_MS;
        if (!force && users.length > 0 && isFresh) return;
        if (usersFetchInFlightRef.current) return usersFetchInFlightRef.current;
        usersFetchInFlightRef.current = fetchUsers().finally(() => {
            usersFetchInFlightRef.current = null;
        });
        return usersFetchInFlightRef.current;
    }, [fetchUsers, users.length]);

    const ensureBrandsLoaded = useCallback(async (opts?: { force?: boolean }) => {
        const force = Boolean(opts?.force);
        const isFresh = brandsFetchedAtRef.current && Date.now() - brandsFetchedAtRef.current < SUPPORTING_FETCH_TTL_MS;
        if (!force && apiBrands.length > 0 && isFresh) return;
        if (brandsFetchInFlightRef.current) return brandsFetchInFlightRef.current;
        brandsFetchInFlightRef.current = fetchBrands().finally(() => {
            brandsFetchInFlightRef.current = null;
        });
        return brandsFetchInFlightRef.current;
    }, [apiBrands.length, fetchBrands]);

    const ensureCompaniesLoaded = useCallback(async (opts?: { force?: boolean }) => {
        const force = Boolean(opts?.force);
        const isFresh = companiesFetchedAtRef.current && Date.now() - companiesFetchedAtRef.current < SUPPORTING_FETCH_TTL_MS;
        if (!force && companies.length > 0 && isFresh) return;
        if (companiesFetchInFlightRef.current) return companiesFetchInFlightRef.current;
        companiesFetchInFlightRef.current = fetchCompanies().finally(() => {
            companiesFetchInFlightRef.current = null;
        });
        return companiesFetchInFlightRef.current;
    }, [companies.length, fetchCompanies]);

    const ensureTaskTypesLoaded = useCallback(async (opts?: { force?: boolean }) => {
        const force = Boolean(opts?.force);
        const isFresh = taskTypesFetchedAtRef.current && Date.now() - taskTypesFetchedAtRef.current < SUPPORTING_FETCH_TTL_MS;
        if (!force && taskTypes.length > 0 && isFresh) return;
        if (taskTypesFetchInFlightRef.current) return taskTypesFetchInFlightRef.current;
        taskTypesFetchInFlightRef.current = fetchTaskTypes().finally(() => {
            taskTypesFetchInFlightRef.current = null;
        });
        return taskTypesFetchInFlightRef.current;
    }, [fetchTaskTypes, taskTypes.length]);

    useEffect(() => {
        const handler = (e: any) => {
            const detail = e?.detail || {};
            void (async () => {
                await ensureUsersLoaded({ force: true });
                await ensureBrandsLoaded({ force: true });
                await ensureTaskTypesLoaded({ force: true });
                const companyName = (detail?.companyName || '').toString().trim();
                const userId = (detail?.userId || '').toString().trim();
                if (!companyName || !userId) return;
                const userDoc: any = (usersRef.current || []).find((u: any) => {
                    const id = (u?.id || u?._id || '').toString().trim();
                    return id && id === userId;
                });
                const email = stripDeletedEmailSuffix(userDoc?.email).trim().toLowerCase();
                if (email) await fetchUserBrandTaskTypeMappingsCached(companyName, email);
            })();
        };
        window.addEventListener('assignmentsApplied', handler as any);
        return () => window.removeEventListener('assignmentsApplied', handler as any);
    }, [ensureBrandsLoaded, ensureTaskTypesLoaded, ensureUsersLoaded, fetchUserBrandTaskTypeMappingsCached]);

    const fetchCurrentUser = useCallback(async () => {
        try {
            const response = await authService.getCurrentUser();
            if (response && response.success && response.data) {
                const userData: any = response.data;
                const nextUser = {
                    ...userData,
                    id: userData.id || userData._id || userData.userId || '',
                    name: userData.name || userData.username || 'User',
                    role: userData.role || 'user',
                    email: userData.email || '',
                };
                setCurrentUser(prev => ({
                    ...(prev as any),
                    ...nextUser,
                }));
                try {
                    localStorage.setItem('currentUser', JSON.stringify(nextUser));
                } catch {
                    // ignore
                }
                return;
            }
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            navigate('/login');
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            navigate('/login');
        } finally {
            setIsAuthReady(true);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCurrentUser();
        const savedSidebarState = localStorage.getItem('sidebarCollapsed');
        if (savedSidebarState) {
            setIsSidebarCollapsed(JSON.parse(savedSidebarState));
        }
    }, [fetchCurrentUser]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role !== 'md_manager' && role !== 'ob_manager') return;
        const fromCompanies = (companies || []).map(c => (c?.name || '').toString().trim()).filter(Boolean);
        if (fromCompanies.length !== 1) return;
        const only = fromCompanies[0];
        setNewTask(prev => {
            const current = (prev?.companyName || '').toString().trim();
            if (current) return prev;
            return { ...prev, companyName: only };
        });
    }, [companies, currentUser?.role]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role !== 'md_manager' && role !== 'ob_manager') return;
        const fromCompanies = (companies || []).map(c => (c?.name || '').toString().trim()).filter(Boolean);
        if (fromCompanies.length !== 1) return;
        const only = fromCompanies[0];
        setFilters(prev => {
            const current = (prev?.company || '').toString().trim();
            if (current && current !== 'all') return prev;
            return { ...prev, company: only };
        });
    }, [companies, currentUser?.role]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().trim().toLowerCase();
        const fetchAllBrandsRole = role === 'admin' || role === 'super_admin';
        if (fetchAllBrandsRole) return;
        if (!showAddTaskModal && !showEditTaskModal) return;
        const intervalId = window.setInterval(() => {
            void ensureBrandsLoaded({ force: true });
        }, BRANDS_AUTO_REFRESH_MS);
        return () => {
            window.clearInterval(intervalId);
        };
    }, [BRANDS_AUTO_REFRESH_MS, currentUser?.role, ensureBrandsLoaded, showAddTaskModal, showEditTaskModal]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role === 'sbm') {
            const defaultCompany = (availableCompaniesForSbm[0] || SPEED_E_COM_COMPANY_NAME || '').toString().trim() || SPEED_E_COM_COMPANY_NAME;
            setNewTask(prev => {
                const current = (prev?.companyName || '').toString().trim();
                if (current) return prev;
                return { ...prev, companyName: defaultCompany };
            });
            return;
        }
        if (role !== 'rm' && role !== 'am' && role !== 'sales_manager' && role !== 'sales_man') return;
        setNewTask(prev => {
            const current = (prev?.companyName || '').toString().trim();
            if (current) return prev;
            return { ...prev, companyName: SPEED_E_COM_COMPANY_NAME };
        });
    }, [SPEED_E_COM_COMPANY_NAME, availableCompaniesForSbm, currentUser?.role]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        if (role === 'sbm') {
            const defaultCompany = (availableCompaniesForSbm[0] || SPEED_E_COM_COMPANY_NAME || '').toString().trim() || SPEED_E_COM_COMPANY_NAME;
            setFilters(prev => {
                const current = (prev?.company || '').toString().trim();
                if (current && current !== 'all') return prev;
                return { ...prev, company: defaultCompany };
            });
            return;
        }
        if (role !== 'rm' && role !== 'am' && role !== 'sales_manager' && role !== 'sales_man') return;
        setFilters(prev => {
            const current = (prev?.company || '').toString().trim();
            if (current && current !== 'all') return prev;
            return { ...prev, company: SPEED_E_COM_COMPANY_NAME };
        });
    }, [SPEED_E_COM_COMPANY_NAME, availableCompaniesForSbm, currentUser?.role]);

    useEffect(() => {
        const role = (currentUser?.role || '').toString().trim().toLowerCase();
        const needsUsers =
            currentView === 'dashboard' ||
            currentView === 'reviews' ||
            currentView === 'team' ||
            currentView === 'all-tasks' ||
            currentView === 'access' ||
            role === 'ob_manager' ||
            showAddTaskModal ||
            showEditTaskModal;
        const needsBrands =
            currentView === 'dashboard' ||
            currentView === 'brands' ||
            currentView === 'brand-detail' ||
            currentView === 'all-tasks' ||
            showAddTaskModal ||
            showEditTaskModal ||
            showBulkBrandModal ||
            showManagerAddBrandModal ||
            showAdvancedFilters;
        const needsTaskTypes =
            showAddTaskModal ||
            showEditTaskModal ||
            showBulkTaskTypeModal ||
            showAdvancedFilters;
        const needsCompaniesForRole =
            role === 'admin' ||
            role === 'super_admin' ||
            role === 'md_manager' ||
            role === 'ob_manager' ||
            role === 'sbm' ||
            role === 'rm' ||
            role === 'am';
        const needsCompanies = needsCompaniesForRole && (showAddTaskModal || showEditTaskModal || showBulkTaskTypeModal || showAdvancedFilters);
        if (needsUsers) {
            void ensureUsersLoaded();
        }
        if (needsBrands) {
            // Force refresh brands when navigating to all-tasks to ensure group numbers are loaded
            const isAllTasksView = currentView === 'all-tasks';
            void ensureBrandsLoaded({ force: isAllTasksView });
        }
        if (needsCompanies) {
            void ensureCompaniesLoaded();
        }
        if (needsTaskTypes) {
            void ensureTaskTypesLoaded();
        }
    }, [
        currentUser?.role,
        currentView,
        ensureBrandsLoaded,
        ensureCompaniesLoaded,
        ensureTaskTypesLoaded,
        ensureUsersLoaded,
        showAddTaskModal,
        showAdvancedFilters,
        showBulkBrandModal,
        showBulkTaskTypeModal,
        showEditTaskModal,
        showManagerAddBrandModal,
    ]);

    const getAssignedToValue = useCallback((assignedTo: any): string => {
        if (!assignedTo) return '';
        if (typeof assignedTo === 'string') return assignedTo;
        if (typeof assignedTo === 'object' && assignedTo !== null) {
            return assignedTo.email || assignedTo.name || '';
        }
        return '';
    }, []);

    const updateTaskInState = useCallback((updatedTask: Task) => {
        dispatch(taskUpserted(updatedTask));
    }, [dispatch]);

    const openAddTaskModal = useCallback(() => {
        const role = (currentUser?.role || '').toString().toLowerCase();
        const resolvedCompany = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
        const defaultCompanyForRole = (role === 'md_manager' || role === 'ob_manager' || role === 'troubleshoot_manager')
            ? MD_IMPEX_COMPANY_NAME
            : (role === 'sales_manager' || role === 'sales_man')
                ? (resolvedCompany || 'Speed Ecom')
                : (resolvedCompany || MD_IMPEX_COMPANY_NAME);
        if (role === 'md_manager' || role === 'ob_manager' || role === 'manager' || role === 'marketer_manager' || role === 'assistant' || role === 'troubleshoot_manager' || role === 'sales_manager' || role === 'sales_man') {
            setNewTask(prev => {
                const current = (prev?.companyName || '').toString().trim();
                const isSalesRole = (role === 'sales_manager' || role === 'sales_man');
                if (current && !isSalesRole) return prev;
                return { ...prev, companyName: defaultCompanyForRole };
            });
        }
        void ensureUsersLoaded();
        void ensureBrandsLoaded({ force: true });
        void ensureTaskTypesLoaded();
        if (role === 'admin' || role === 'super_admin') {
            void ensureCompaniesLoaded();
        }
        setShowAddTaskModal(true);
    }, [
        MD_IMPEX_COMPANY_NAME,
        currentUser?.role,
        (currentUser as any)?.company,
        (currentUser as any)?.companyName,
        ensureBrandsLoaded,
        ensureCompaniesLoaded,
        ensureTaskTypesLoaded,
        ensureUsersLoaded,
    ]);

    const handleOpenEditModal = useCallback((task: Task) => {
        void ensureUsersLoaded();
        void ensureBrandsLoaded(); // Remove force: true to avoid unnecessary refetch
        void ensureCompaniesLoaded();
        void ensureTaskTypesLoaded();
        if (!canEditTask(task)) {
            toast.error('You do not have permission to edit this task');
            setOpenMenuId(null);
            return;
        }
        if (Boolean(task?.completedApproval)) {
            toast.error('Editing not allowed for permanently approved tasks');
            setOpenMenuId(null);
            return;
        }
        setEditingTask(task);
        const resolvedTaskId = ((task as any)?.id || (task as any)?._id || '').toString();
        const isMdImpexTask = (task.companyName || '').toLowerCase().replace(/\s+/g, '') === 'mdimpex';
        const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
        const currentUserRole = String((currentUser as any)?.role || '').trim().toLowerCase();
        const isMdImpexUser = currentUserCompany.includes('mdimpex') ||
            currentUserCompany.includes('md_impex') ||
            currentUserCompany.includes('md impex') ||
            currentUserRole === 'md_manager' ||
            currentUserRole === 'assistant' ||
            currentUserRole === 'assistance';
        if (isMdImpexTask || isMdImpexUser) {
            const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
            setEditFormData({
                id: resolvedTaskId,
                title: task.title || '',
                assignedTo: getAssignedToValue(task.assignedTo),
                dueDate: dueDate,
                priority: task.priority || 'medium',
                taskType: (task.taskType || '').toString().trim().toLowerCase(),
                companyName: task.companyName || '',
                brand: task.brand || '',
                status: task.status || 'pending'
            });
            setEditFormErrors({});
            setShowMdImpexEditModal(true);
        } else {
            const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
            setEditFormData({
                id: resolvedTaskId,
                title: task.title || '',
                assignedTo: getAssignedToValue(task.assignedTo),
                dueDate: dueDate,
                priority: task.priority || 'medium',
                taskType: task.taskType || '',
                companyName: task.companyName || '',
                brand: task.brand || '',
                status: task.status || 'pending'
            });
            setEditFormErrors({});
            setShowEditTaskModal(true);
        }
        setOpenMenuId(null);
    }, [canEditTask, ensureBrandsLoaded, ensureCompaniesLoaded, ensureTaskTypesLoaded, ensureUsersLoaded, getAssignedToValue]);

    const handleSaveTaskFromModal = useCallback(async (taskDataFromModal?: NewTaskForm) => {
        const dataToValidate = taskDataFromModal || newTask;
        if (!validateForm(dataToValidate)) return;
        setIsCreatingTask(true);
        try {
            const selectedBrandObj = brands.find(b =>
                normalizeText(b.name) === normalizeText(dataToValidate.brand) &&
                normalizeText((b as any).company || (b as any).companyName) === normalizeText(dataToValidate.companyName)
            );
            const resolvedBrandId = (() => {
                const candidate = (selectedBrandObj as any)?.id || (selectedBrandObj as any)?._id;
                return isMongoObjectId(candidate) ? candidate : null;
            })();
            const taskData = {
                title: dataToValidate.title,
                assignedTo: dataToValidate.assignedTo,
                dueDate: dataToValidate.dueDate,
                priority: dataToValidate.priority === 'urgent' ? 'high' : dataToValidate.priority,
                taskType: dataToValidate.taskType,
                companyName: dataToValidate.companyName,
                brand: dataToValidate.brand,
                brandId: resolvedBrandId,
                status: 'pending' as TaskStatus,
                assignedBy: currentUser.email,
                assignedToUser: users.find(u => u.email === dataToValidate.assignedTo),
            };
            const response = await taskService.createTask(taskData);
            if (response.success && response.data) {
                dispatch(taskAdded(response.data as Task));
                setShowAddTaskModal(false);
                setNewTask({
                    title: '',
                    assignedTo: '',
                    dueDate: '',
                    priority: 'medium',
                    taskType: '',
                    companyName: '',
                    brand: '',
                });
                toast.success('Task created successfully!');
            } else {
                toast.error(response.message || 'Failed to create task');
            }
        } catch (error) {
            toast.error('Failed to create task');
        } finally {
            setIsCreatingTask(false);
        }
    }, [brands, newTask, currentUser, users, validateForm, isMongoObjectId, dispatch]);

    const handleBulkCreateTasks = useCallback(
        async (payloads: any[]): Promise<{ created: Task[]; failures: { index: number; rowNumber: number; title: string; reason: string }[] }> => {
            const created: Task[] = [];
            const failures: { index: number; rowNumber: number; title: string; reason: string }[] = [];
            for (let index = 0; index < payloads.length; index++) {
                const payload = payloads[index];
                try {
                    const selectedBrandObj = brands.find(b =>
                        normalizeText(b.name) === normalizeText(payload.brand) &&
                        normalizeText((b as any).company || (b as any).companyName) === normalizeText(payload.companyName)
                    );
                    const resolvedBrandId = (() => {
                        const candidate = (selectedBrandObj as any)?.id || (selectedBrandObj as any)?._id;
                        return isMongoObjectId(candidate) ? candidate : null;
                    })();
                    const taskData = {
                        title: payload.title,
                        assignedTo: payload.assignedTo,
                        dueDate: payload.dueDate,
                        priority: payload.priority === 'urgent' ? 'high' : payload.priority,
                        taskType: payload.taskType || '',
                        companyName: payload.companyName || '',
                        brand: payload.brand || '',
                        brandId: resolvedBrandId,
                        status: 'pending' as TaskStatus,
                        assignedBy: currentUser.email,
                        assignedToUser: users.find(u => u.email === payload.assignedTo),
                    };
                    const response = await taskService.createTask(taskData);
                    if (response.success && response.data) {
                        created.push(response.data as Task);
                    } else {
                        failures.push({
                            index,
                            rowNumber: payload.rowNumber ?? index + 1,
                            title: payload.title || 'Untitled Task',
                            reason: response.message || 'Failed to create task',
                        });
                    }
                } catch (error: any) {
                    failures.push({
                        index,
                        rowNumber: payload.rowNumber ?? index + 1,
                        title: payload.title || 'Untitled Task',
                        reason: error?.message || 'Unexpected error while creating task',
                    });
                }
            }
            if (created.length > 0) {
                dispatch(tasksAddedMany(created));
            }
            return { created, failures };
        },
        [brands, currentUser, users, isMongoObjectId, dispatch]
    );

    const handleSaveEditedTask = useCallback(async () => {
        if (!validateEditForm() || !editingTask) return;
        const resolvedTaskId = ((editFormData as any)?.id || (editingTask as any)?.id || (editingTask as any)?._id || '').toString();
        if (!resolvedTaskId) {
            toast.error('Task id is missing. Please refresh and try again.');
            return;
        }
        if (!canEditTask(editingTask)) {
            toast.error('You do not have permission to edit this task');
            return;
        }
        setIsUpdatingTask(true);
        try {
            const myEmail = stripDeletedEmailSuffix(currentUser?.email || '').trim().toLowerCase();
            const previousDueDate = editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : '';
            const dueDateChanged = Boolean(previousDueDate && editFormData.dueDate && previousDueDate !== editFormData.dueDate);
            const speedEcomTask = isSpeedEcomTask(editingTask);
            const isMdImpexTask = ((editingTask as any)?.companyName || (editingTask as any)?.company || '').toString().toLowerCase().replace(/\s+/g, '') === 'mdimpex';
            const assigneeEmail = getTaskAssigneeEmail(editingTask);
            const canEditDueDateForSpeedEcom = !speedEcomTask || (myEmail && assigneeEmail && myEmail === assigneeEmail);
            const selectedBrandObj = brands.find(b =>
                normalizeText(b.name) === normalizeText(editFormData.brand) &&
                normalizeText((b as any).company || (b as any).companyName) === normalizeText(editFormData.companyName)
            );
            const resolvedBrandId = (() => {
                const candidate = (selectedBrandObj as any)?.id || (selectedBrandObj as any)?._id;
                return isMongoObjectId(candidate) ? candidate : null;
            })();
            const updateData: any = {
                title: editFormData.title,
                assignedTo: editFormData.assignedTo,
                priority: editFormData.priority,
                taskType: (editFormData.taskType || '').toString().trim().toLowerCase(),
                companyName: editFormData.companyName,
                brand: editFormData.brand,
                status: editFormData.status,
            };
            if (resolvedBrandId) {
                updateData.brandId = resolvedBrandId;
            }
            if (isMdImpexTask) {
                if (editFormData.dueDate) updateData.dueDate = editFormData.dueDate;
            } else if (dueDateChanged) {
                updateData.dueDate = editFormData.dueDate;
            }
            if (!canEditDueDateForSpeedEcom) {
                if (dueDateChanged) {
                    toast.error('Only the assignee can update due date for Speed E Com tasks');
                    delete updateData.dueDate;
                }
            }
            const response = await taskService.updateTask(resolvedTaskId, updateData);
            if (response.success && response.data) {
                updateTaskInState(response.data as Task);
                try {
                    const prevStatus = String((editingTask as any)?.status || '').trim();
                    const nextStatus = String((editFormData as any)?.status || '').trim();
                    if (prevStatus && nextStatus && prevStatus !== nextStatus) {
                        const historyPayload: any = {
                            taskId: resolvedTaskId,
                            action: 'status_changed',
                            message: `Task status changed by ${currentUser.name} (${String(currentUser.role || '').toLowerCase()})`,
                            userId: currentUser.id,
                            userName: currentUser.name,
                            userEmail: currentUser.email,
                            userRole: currentUser.role,
                            additionalData: {
                                fromStatus: prevStatus,
                                toStatus: nextStatus,
                            }
                        };
                        await taskService.addTaskHistory(resolvedTaskId, historyPayload);
                    }
                } catch {
                    // ignore history failure
                }
                setShowEditTaskModal(false);
                setShowMdImpexEditModal(false);
                setEditingTask(null);
                toast.success('Task updated successfully!');
            } else {
                toast.error(response.message || 'Failed to update task');
            }
        } catch (error) {
            toast.error('Failed to update task');
        } finally {
            setIsUpdatingTask(false);
        }
    }, [validateEditForm, editingTask, editFormData, brands, users, isMongoObjectId, updateTaskInState, currentUser, getTaskAssigneeEmail, isSpeedEcomTask]);

    const handleToggleTaskStatus = useCallback(async (taskId: string, currentStatus: TaskStatus, doneByAdmin: boolean = false) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            toast.error('Task not found');
            return;
        }
        if (task.completedApproval && currentStatus === 'completed') {
            toast.error('This task has been permanently approved and cannot be changed');
            return;
        }
        if (!canMarkTaskDone(task) && !doneByAdmin) {
            toast.error('You can only mark tasks assigned to you as done');
            return;
        }
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        try {
            const response = await taskService.updateTask(taskId, {
                status: newStatus,
                ...(newStatus === 'pending'
                    ? { completedApproval: false }
                    : doneByAdmin
                        ? { completedApproval: true }
                        : {}),
            });
            if (!response.success || !response.data) {
                toast.error(response.message || 'Failed to update task');
                return;
            }
            updateTaskInState(response.data as Task);
            toast.success(`Task marked as ${newStatus}`);
            try {
                const historyPayload: any = {
                    taskId,
                    action: 'status_changed',
                    message: `Task status changed by ${currentUser.name} (${String(currentUser.role || '').toLowerCase()})`,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    userRole: currentUser.role,
                    additionalData: {
                        fromStatus: currentStatus,
                        toStatus: newStatus,
                    }
                };
                await taskService.addTaskHistory(taskId, historyPayload);
            } catch {
                // ignore history failure
            }
        } catch (error) {
            toast.error('Failed to update task');
        }
    }, [tasks, canMarkTaskDone, updateTaskInState, currentUser]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        if (!canEditDeleteTask(task)) {
            toast.error('Only the task creator can delete this task');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            const response = await taskService.deleteTask(taskId);
            if (!response.success) {
                toast.error(response.message || 'Failed to delete task');
                return;
            }
            dispatch(taskRemoved(taskId));
            toast.success('Task deleted');
        } catch (error) {
            toast.error('Failed to delete task');
        }
    }, [tasks, canEditDeleteTask, dispatch]);

    const handleUpdateTask = useCallback(async (taskId: string, updatedData: Partial<Task>): Promise<Task | null> => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            toast.error('Task not found');
            return null;
        }
        if (!canEditTask(task)) {
            toast.error('You do not have permission to edit this task');
            return null;
        }
        try {
            const updatePayload = {
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            const response = await taskService.updateTask(taskId, updatePayload);
            if (!response.success) {
                toast.error(response.message || 'Failed to update task');
                return null;
            }
            if (!response.data) {
                toast.error('No data received from server');
                return null;
            }
            const updatedTask = response.data as Task;
            updateTaskInState(updatedTask);
            toast.success('Task updated successfully');
            return updatedTask;
        } catch (error: any) {
            let errorMessage = 'Failed to update task';
            if (error.response?.status === 401) {
                errorMessage = 'Session expired. Please login again.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to edit this task';
            } else if (error.response?.status === 404) {
                errorMessage = 'Task not found on server';
            }
            toast.error(errorMessage);
            return null;
        }
    }, [tasks, canEditTask, updateTaskInState]);

    const handleManagerCreateBrand = useCallback(async () => {
        if (!newTask.companyName) {
            toast.error('Please select a company first');
            return;
        }
        const name = (managerBrandName || '').toString().trim();
        if (!name) {
            toast.error('Please enter brand name');
            return;
        }
        const company = (newTask.companyName || '').toString().trim();
        const normalizedCompany = normalizeText(company);
        const normalizedName = normalizeText(name);
        const existingBrands = Array.isArray(apiBrands) ? apiBrands : [];
        const hasDuplicate = existingBrands.some((b: any) => {
            const bCompany = normalizeText((b?.company || b?.companyName || '') as string);
            if (bCompany !== normalizedCompany) return false;
            const bName = normalizeText((b?.name || b?.brandName || b?.brand || '') as string);
            return bName === normalizedName;
        });
        if (hasDuplicate) {
            toast.error(`Brand "${name}" already exists for company "${company}".`);
            return;
        }
        setIsCreatingManagerBrand(true);
        try {
            const res = await brandService.createBrand({
                name,
                company: newTask.companyName,
                status: 'active',
            } as any);
            if (res.success && res.data) {
                dispatch(brandUpserted(res.data as Brand));
                handleInputChange('brand', res.data.name);
                setShowManagerAddBrandModal(false);
                setManagerBrandName('');
            } else {
                toast.error('Failed to create brand');
            }
        } catch (error) {
            toast.error('Failed to create brand');
        } finally {
            setIsCreatingManagerBrand(false);
        }
    }, [apiBrands, handleInputChange, managerBrandName, newTask.companyName, normalizeText]);

    if (loading) {
        return <DashboardPageSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            <SendReminderModal
                open={sendReminderOpen}
                task={sendReminderTask}
                onClose={closeSendReminderModal}
                onSend={submitSendReminder}
                isSending={Boolean(sendingReminderByTaskId[String((sendReminderTask as any)?.id || (sendReminderTask as any)?._id || '')])}
            />
            {activeReminder && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative w-[92vw] max-w-md">
                        <TaskReminderCard
                            reminder={activeReminder as any}
                            onAcknowledge={() => acknowledgeReminder(activeReminder.id)}
                        />
                    </div>
                </div>
            )}
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                currentUser={currentUser}
                handleLogout={handleLogout}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                navigateTo={navigateTo}
                assignedByMePendingCount={assignedByMePendingCount}
                assignedToMePendingCount={assignedToMePendingCount}
                currentView={currentView}
            />
            {reviewModalTaskId && reviewModalTask ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <div className="text-sm font-semibold text-gray-900">Task Completed</div>
                            <div className="mt-1 text-xs text-gray-600">Review is required before continuing</div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-sm font-semibold text-gray-900 truncate">{String((reviewModalTask as any)?.title || 'Task')}</div>
                                <div className="mt-1 text-xs text-gray-600">
                                    {String((reviewModalTask as any)?.assignedToUser?.name || (reviewModalTask as any)?.assignedToUser?.email || (reviewModalTask as any)?.assignedTo || '').trim()
                                        ? `Completed by ${(reviewModalTask as any)?.assignedToUser?.name || (reviewModalTask as any)?.assignedToUser?.email || (reviewModalTask as any)?.assignedTo}`
                                        : ''}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">Rating</div>
                                <div className="mt-2 flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setReviewModalStars(n)}
                                            disabled={reviewModalSubmitting}
                                            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-60"
                                            aria-label={`Rate ${n} stars`}
                                        >
                                            <Star
                                                className={n <= reviewModalStars ? 'h-6 w-6 text-yellow-500' : 'h-6 w-6 text-gray-300'}
                                                fill={n <= reviewModalStars ? 'currentColor' : 'none'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">Comment (optional)</div>
                                <textarea
                                    value={reviewModalComment}
                                    onChange={(e) => setReviewModalComment(e.target.value)}
                                    disabled={reviewModalSubmitting}
                                    className="mt-2 w-full min-h-[110px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                    placeholder="Add feedback..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={submitReviewFromModal}
                                disabled={reviewModalSubmitting || reviewModalStars === 0}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                                {reviewModalSubmitting ? 'Saving...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className={mainContentClasses}>
                <Navbar
                    setSidebarOpen={setSidebarOpen}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    currentUser={currentUser}
                    showLogout={showLogout}
                    setShowLogout={setShowLogout}
                    handleLogout={handleLogout}
                    isSidebarCollapsed={isSidebarCollapsed}
                />
                <main className="flex-1 overflow-auto pb-24 sm:pb-0">
                    <div className="py-0 sm:py-8">
                        <div className={dashboardContainerClasses}>
                            {currentView === 'dashboard' ? (
                                <>
                                    <div className="mb-6 sm:mb-10 px-4 sm:px-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h1 className="text-4xl sm:text-2xl font-bold text-gray-900">
                                                        Dashboard
                                                    </h1>
                                                </div>
                                                <p className="text-gray-600 ">
                                                    {canViewAllTasks
                                                        ? `Welcome ${currentUser.name}. Manage all tasks.`
                                                        : `Welcome back, ${currentUser.name}. Here are your tasks.`
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                                                >
                                                    <Filter className="mr-2 h-4 w-4" />
                                                    Advanced Filters
                                                    {getActiveFilterCount() > 0 && (
                                                        <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                                            {getActiveFilterCount()}
                                                        </span>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setCurrentView('all-tasks')}
                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary-dark"
                                                >
                                                    <ListTodo className="mr-2 h-4 w-4" />
                                                    View All Tasks
                                                </button>
                                                {canCreateTasks && (
                                                    <button
                                                        onClick={() => openAddTaskModal()}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-primary-light hover:bg-primary"
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Add Task
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <AdvancedFilters
                                        filters={filters}
                                        availableCompanies={availableCompanies}
                                        availableTaskTypes={availableTaskTypesForFilters}
                                        availableBrands={availableBrands}
                                        availableRms={availableRmUsersForFilters}
                                        getBrandLabel={getBrandLabelForFilter}
                                        users={users}
                                        currentUser={currentUser}
                                        onFilterChange={handleAdvancedFilterChange}
                                        onResetFilters={resetFilters}
                                        showFilters={showAdvancedFilters}
                                        onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    />
                                    {showTaskCommentSidebar && commentSidebarTask ? (
                                        <div className="fixed inset-0 z-50">
                                            <div
                                                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                                                onClick={handleCloseTaskCommentSidebar}
                                            />
                                            <div className="absolute inset-0 right-0">
                                                <div className="h-full bg-white shadow-xl overflow-y-auto w-full md:w-[500px]">
                                                    <div className="sticky top-0 bg-white border-b z-10">
                                                        <div className="px-4 py-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <h2 className="text-lg font-bold text-gray-900">Comments</h2>
                                                                    <p className="text-gray-600 text-sm mt-1">{commentSidebarTask.title}</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCloseTaskCommentSidebar}
                                                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                                                >
                                                                    <X className="h-5 w-5 text-gray-500" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="mb-4">
                                                            <h4 className="font-medium text-gray-900 mb-2">Add Comment</h4>
                                                            <textarea
                                                                value={commentDraft}
                                                                onChange={(e) => setCommentDraft(e.target.value)}
                                                                placeholder="Type your comment here..."
                                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[90px] resize-none"
                                                                rows={3}
                                                            />
                                                            <div className="flex justify-end mt-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSubmitTaskComment}
                                                                    disabled={!commentDraft.trim() || commentSidebarLoading}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                                                                >
                                                                    {commentSidebarLoading ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                            Sending...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Send className="h-4 w-4" />
                                                                            Add Comment
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="border-t pt-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-medium text-gray-900">All Comments</h4>
                                                                <span className="text-xs text-gray-500">
                                                                    {getCommentSidebarComments(String(commentSidebarTask.id)).length} total
                                                                </span>
                                                            </div>
                                                            {commentSidebarLoadingComments ? (
                                                                <div className="text-center py-8">
                                                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                                                                    <p className="mt-2 text-gray-500">Loading comments...</p>
                                                                </div>
                                                            ) : getCommentSidebarComments(String(commentSidebarTask.id)).length === 0 ? (
                                                                <div className="text-center py-8">
                                                                    <MessageSquare className="h-10 w-10 mx-auto text-gray-300" />
                                                                    <p className="mt-2 text-gray-500">No comments yet</p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {getCommentSidebarComments(String(commentSidebarTask.id)).map((c) => (
                                                                        <div key={c.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                                                <div className="text-xs font-semibold text-gray-700 truncate" title={c.userEmail}>
                                                                                    {c.userName || c.userEmail}
                                                                                </div>
                                                                                <div className="text-[11px] text-gray-500 shrink-0">
                                                                                    {c.createdAt ? formatDate(c.createdAt) : ''}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                                                                {(c.content || '').trim()}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="hidden sm:block mb-10 px-4 sm:px-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                            {stats.map((stat) => (
                                                <button
                                                    key={stat.name}
                                                    onClick={() => handleStatClick(stat.id)}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={selectedStatFilter === stat.id}
                                                    className={`
                    bg-white p-4 rounded-xl shadow-sm border-2 cursor-pointer 
                    transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 
                    relative group
                    ${selectedStatFilter === stat.id
                                                            ? 'border-[#1e3a8a] shadow-md'
                                                            : 'border-gray-100 hover:border-[#1e3a8a]'
                                                        }
                `}
                                                >
                                                    {/* Selection Indicator */}
                                                    <div
                                                        className={`
                        absolute top-3 right-3 h-4 w-4 rounded-full border-2 
                        transition-all duration-200 ease-out
                        ${selectedStatFilter === stat.id
                                                                ? 'border-[#1e3a8a] bg-[#3b82f6] scale-100'
                                                                : 'border-gray-200 bg-white group-hover:border-[#1e3a8a] group-hover:scale-110'
                                                            }
                    `}
                                                    >
                                                        {selectedStatFilter === stat.id && (
                                                            <div className="h-full w-full flex items-center justify-center">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-start">
                                                        <div className="flex-1">
                                                            {/* Icon and Value Row */}
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div
                                                                    className={`
                                    p-2 rounded-lg transition-all duration-200
                                    ${selectedStatFilter === stat.id
                                                                            ? 'bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20'
                                                                            : 'bg-gray-50 group-hover:bg-[#3b82f6]/5'
                                                                        }
                                `}
                                                                >
                                                                    <stat.icon
                                                                        className={`
                                        h-5 w-5 transition-colors duration-200
                                        ${selectedStatFilter === stat.id
                                                                                ? 'text-[#3b82f6]'
                                                                                : 'text-gray-400 group-hover:text-[#3b82f6]'
                                                                            }
                                    `}
                                                                    />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-xs font-medium text-black tracking-wide">
                                                                        {stat.name}
                                                                    </p>
                                                                    <div className="flex items-baseline gap-2 mt-0.5">
                                                                        <p className="text-2xl font-bold text-black">{stat.value}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Footer */}
                                                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                                                                <span className={`
                                text-[10px] font-medium px-2 py-0.5 rounded-full 
                                transition-all duration-200
                                ${selectedStatFilter === stat.id
                                                                        ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                                                        : 'bg-gray-50 text-gray-400 group-hover:bg-[#3b82f6]/5 group-hover:text-[#3b82f6]'
                                                                    }
                            `}>
                                                                    {selectedStatFilter === stat.id ? '✓ Selected' : 'Filter'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Hover Effect Overlay - Thin border (ring-1) */}
                                                    <div className={`
                    absolute inset-0 rounded-xl pointer-events-none transition-all duration-300
                    ${selectedStatFilter === stat.id
                                                            ? 'ring-1 ring-[#1e3a8a] ring-inset'
                                                            : 'group-hover:ring-1 group-hover:ring-[#1e3a8a] ring-inset'
                                                        }
                `} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {(!isSpeedEcomUser || String((currentUser as any)?.role || '').trim().toLowerCase() === 'admin' || String((currentUser as any)?.role || '').trim().toLowerCase() === 'super_admin') ? (
                                        String((currentUser as any)?.role || '').trim().toLowerCase() !== 'troubleshoot_manager' ? (
                                            <>
                                                {roleIsAdminLike ? (
                                                    <div className="mb-6 px-4 sm:px-0">
                                                        {String((currentUser as any)?.role || '').trim().toLowerCase() === 'manager' ? null : (
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDashboardSpotlight('employee-of-month')}
                                                                    className={`
        bg-white p-4 rounded-xl shadow-sm border-2 cursor-pointer 
        transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 
        relative group
        ${dashboardSpotlight === 'employee-of-month'
                                                                            ? 'border-[#1e3a8a] shadow-md'
                                                                            : 'border-gray-100 hover:border-[#1e3a8a]'
                                                                        }
    `}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div>
                                                                            <h2 className="text-xs font-medium text-black tracking-wide">
                                                                                <span className="inline-flex items-center gap-2">
                                                                                    <span className={`
                            inline-flex items-center justify-center w-6 h-6 rounded-lg 
                            transition-all duration-200
                            ${dashboardSpotlight === 'employee-of-month'
                                                                                            ? 'bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20'
                                                                                            : 'bg-gray-50 group-hover:bg-[#3b82f6]/5'
                                                                                        }
                        `}>
                                                                                        <Crown className={`
                                        h-3.5 w-3.5 transition-colors duration-200
                                        ${dashboardSpotlight === 'employee-of-month'
                                                                                                ? 'text-[#3b82f6]'
                                                                                                : 'text-gray-400 group-hover:text-[#3b82f6]'
                                                                                            }
                                    `} />
                                                                                    </span>
                                                                                    <span>Employee of the Month</span>
                                                                                </span>
                                                                            </h2>
                                                                            <p className="text-[10px] text-gray-500 mt-1">Based on manager reviews</p>
                                                                        </div>
                                                                        <span className={`
                text-[10px] font-medium px-2 py-0.5 rounded-full 
                transition-all duration-200
                ${dashboardSpotlight === 'employee-of-month'
                                                                                ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                                                                : 'bg-gray-50 text-gray-400 group-hover:bg-[#3b82f6]/5 group-hover:text-[#3b82f6]'
                                                                            }
            `}>
                                                                            {dashboardSpotlight === 'employee-of-month' ? '✓ Selected' : 'Filter'}
                                                                        </span>
                                                                    </div>

                                                                    <div className={`
            absolute inset-0 rounded-xl pointer-events-none transition-all duration-300
            ${dashboardSpotlight === 'employee-of-month'
                                                                            ? 'ring-1 ring-[#1e3a8a] ring-inset'
                                                                            : 'group-hover:ring-1 group-hover:ring-[#1e3a8a] ring-inset'
                                                                        }
        `} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDashboardSpotlight('manager-monthly-ranking')}
                                                                    className={`
        bg-white p-4 rounded-xl shadow-sm border-2 cursor-pointer 
        transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 
        relative group
        ${dashboardSpotlight === 'manager-monthly-ranking'
                                                                            ? 'border-[#1e3a8a] shadow-md'
                                                                            : 'border-gray-100 hover:border-[#1e3a8a]'
                                                                        }
    `}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div>
                                                                            <h2 className="text-xs font-medium text-black tracking-wide">
                                                                                <span className="inline-flex items-center gap-2">
                                                                                    <span className={`
                            inline-flex items-center justify-center w-6 h-6 rounded-lg 
                            transition-all duration-200
                            ${dashboardSpotlight === 'manager-monthly-ranking'
                                                                                            ? 'bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20'
                                                                                            : 'bg-gray-50 group-hover:bg-[#3b82f6]/5'
                                                                                        }
                        `}>
                                                                                        <Trophy className={`
                                        h-3.5 w-3.5 transition-colors duration-200
                                        ${dashboardSpotlight === 'manager-monthly-ranking'
                                                                                                ? 'text-[#3b82f6]'
                                                                                                : 'text-gray-400 group-hover:text-[#3b82f6]'
                                                                                            }
                                    `} />
                                                                                    </span>
                                                                                    <span>Employee of the Month Marketer</span>
                                                                                </span>
                                                                            </h2>
                                                                            <p className="text-[10px] text-gray-500 mt-1">Assign vs Achieved</p>
                                                                        </div>
                                                                        <span className={`
                text-[10px] font-medium px-2 py-0.5 rounded-full 
                transition-all duration-200
                ${dashboardSpotlight === 'manager-monthly-ranking'
                                                                                ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                                                                : 'bg-gray-50 text-gray-400 group-hover:bg-[#3b82f6]/5 group-hover:text-[#3b82f6]'
                                                                            }
            `}>
                                                                            {dashboardSpotlight === 'manager-monthly-ranking' ? '✓ Selected' : 'Filter'}
                                                                        </span>
                                                                    </div>

                                                                    <div className={`
                absolute inset-0 rounded-xl pointer-events-none transition-all duration-300
                ${dashboardSpotlight === 'manager-monthly-ranking'
                                                                            ? 'ring-1 ring-[#1e3a8a] ring-inset'
                                                                            : 'group-hover:ring-1 group-hover:ring-[#1e3a8a] ring-inset'
                                                                        }
            `} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDashboardSpotlight('power-star-of-month')}
                                                                    className={`
        bg-white p-4 rounded-xl shadow-sm border-2 cursor-pointer 
        transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 
        relative group
        ${dashboardSpotlight === 'power-star-of-month'
                                                                            ? 'border-[#1e3a8a] shadow-md'
                                                                            : 'border-gray-100 hover:border-[#1e3a8a]'
                                                                        }
    `}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div>
                                                                            <h2 className="text-xs font-medium text-black tracking-wide">
                                                                                <span className="inline-flex items-center gap-2">
                                                                                    <span className={`
                                inline-flex items-center justify-center w-6 h-6 rounded-lg 
                                transition-all duration-200
                                ${dashboardSpotlight === 'power-star-of-month'
                                                                                            ? 'bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20'
                                                                                            : 'bg-gray-50 group-hover:bg-[#3b82f6]/5'
                                                                                        }
                            `}>
                                                                                        <Star className={`
                                            h-3.5 w-3.5 transition-colors duration-200
                                            ${dashboardSpotlight === 'power-star-of-month'
                                                                                                ? 'text-[#3b82f6]'
                                                                                                : 'text-gray-400 group-hover:text-[#3b82f6]'
                                                                                            }
                                        `} />
                                                                                    </span>
                                                                                    <span>Power Star of the Month</span>
                                                                                </span>
                                                                            </h2>
                                                                            <p className="text-[10px] text-gray-500 mt-1">Week wise performance</p>
                                                                        </div>
                                                                        <span className={`
                text-[10px] font-medium px-2 py-0.5 rounded-full 
                transition-all duration-200
                ${dashboardSpotlight === 'power-star-of-month'
                                                                                ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                                                                : 'bg-gray-50 text-gray-400 group-hover:bg-[#3b82f6]/5 group-hover:text-[#3b82f6]'
                                                                            }
            `}>
                                                                            {dashboardSpotlight === 'power-star-of-month' ? '✓ Selected' : 'Filter'}
                                                                        </span>
                                                                    </div>

                                                                    <div className={`
                absolute inset-0 rounded-xl pointer-events-none transition-all duration-300
                ${dashboardSpotlight === 'power-star-of-month'
                                                                            ? 'ring-1 ring-[#1e3a8a] ring-inset'
                                                                            : 'group-hover:ring-1 group-hover:ring-[#1e3a8a] ring-inset'
                                                                        }
            `} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                                {String((currentUser as any)?.role || '').trim().toLowerCase() === 'manager' && effectiveDashboardSpotlight ? (
                                                    <div className="flex items-center mb-4 px-4 sm:px-0">
                                                        <select
                                                            value={dashboardSpotlight}
                                                            onChange={(e) => setDashboardSpotlight(e.target.value as any)}
                                                            className=" w-[260px] px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] transition-all"
                                                        >
                                                            <option value="employee-of-month">Employee of the Month</option>
                                                            <option value="manager-monthly-ranking">Employee of the Month Marketer</option>
                                                            <option value="power-star-of-month">Power Star of the Month</option>
                                                        </select>
                                                    </div>
                                                ) : null}

                                                {effectiveDashboardSpotlight ? (
                                                    effectiveDashboardSpotlight === 'employee-of-month' ? (
                                                        <>
                                                            <EmployeeOfTheMonthCard
                                                                name={employeeOfTheMonth?.name || 'Not any yet'}
                                                                rating={employeeOfTheMonth?.rating || 0}
                                                                performance={employeeOfTheMonth?.performance || 'Not any yet'}
                                                                avg={employeeOfTheMonth?.avg || 'Not any yet'}
                                                                photoUrl={employeeOfTheMonth?.photoUrl}
                                                                totalReviews={employeeOfTheMonth?.totalReviews}
                                                                totalTasksReceived={employeeOfTheMonth?.totalTasksReceived}
                                                                summaryRows={employeeOfTheMonth?.summaryRows}
                                                                monthValue={reviewsMonth}
                                                                onMonthChange={setReviewsMonth}
                                                                headerLeftSlot={null}
                                                            />
                                                        </>
                                                    ) : effectiveDashboardSpotlight === 'manager-monthly-ranking' ? (
                                                        <ManagerMonthlyRankingPage currentUser={currentUser} />
                                                    ) : (
                                                        <PowerStarOfTheMonthPage currentUser={currentUser} />
                                                    )
                                                ) : null}
                                            </>
                                        ) : null
                                    ) : null}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 mt-5">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <ListTodo className="h-4 w-4 text-[#3b82f6]" />
                                                    <h2 className="text-base font-semibold text-black">
                                                        {displayTasks.length} Tasks
                                                    </h2>
                                                    <span className="text-xs text-gray-500">
                                                        • {selectedStatFilter !== 'all' ? `${getActiveFilterCount()} active filter(s)` : 'All tasks'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {selectedStatFilter === 'overdue'
                                                        ? 'Tasks that require immediate attention'
                                                        : selectedStatFilter === 'high-priority'
                                                            ? 'High priority tasks requiring focus'
                                                            : 'Your current tasks at a glance'}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                                    <button
                                                        onClick={() => setViewMode('grid')}
                                                        className={`px-2.5 py-1.5 rounded-md transition-colors ${viewMode === 'grid'
                                                            ? 'bg-white text-[#3b82f6] shadow-sm'
                                                            : 'text-gray-600 hover:text-black'
                                                            }`}
                                                    >
                                                        <Grid className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode('list')}
                                                        className={`px-2.5 py-1.5 rounded-md transition-colors ${viewMode === 'list'
                                                            ? 'bg-white text-[#3b82f6] shadow-sm'
                                                            : 'text-gray-600 hover:text-black'
                                                            }`}
                                                    >
                                                        <List className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <TaskVirtualList
                                        tasks={displayTasks}
                                        viewMode={viewMode}
                                        users={users}
                                        onToggleStatus={handleToggleTaskStatus}
                                        onDelete={handleDeleteTask}
                                        onEdit={handleOpenEditModal}
                                        onSendReminder={handleSendReminder}
                                        onOpenComments={handleOpenTaskCommentSidebar}
                                        formatBrand={_formatBrandWithGroupNumber}
                                        formatDate={formatDate}
                                        canEditTask={canEditTask}
                                        canMarkTaskDone={canMarkTaskDone}
                                        canEditDeleteTask={canEditDeleteTask}
                                        canSendReminderForTask={canSendReminderForTask}
                                        isSbmUser={isSbmUser}
                                        sendingReminderByTaskId={sendingReminderByTaskId}
                                    />

                                    {displayTasks.length > 0 && totalTaskPages > 1 && (
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
                                            <div className="text-xs text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <span>Page {taskPage} of {totalTaskPages}</span>
                                                    <select
                                                        value={String(tasksPerPage)}
                                                        onChange={(e) => {
                                                            const next = Number(e.target.value);
                                                            if (!Number.isFinite(next)) return;
                                                            setTasksPerPage(next);
                                                            setTaskPage(1);
                                                        }}
                                                        className="px-2 py-1 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                                    >
                                                        {PAGE_SIZE_OPTIONS.map((n) => (
                                                            <option key={n} value={String(n)}>
                                                                {n}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                                                    disabled={taskPage <= 1}
                                                    className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-black transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    {taskPageNumbers.map((p) => (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => setTaskPage(p)}
                                                            className={`w-6 h-6 text-xs font-medium rounded-md border transition-colors ${p === taskPage
                                                                ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                                                                : 'bg-white text-black border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setTaskPage((p) => Math.min(totalTaskPages, p + 1))}
                                                    disabled={taskPage >= totalTaskPages}
                                                    className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-black transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : currentView === 'md-impex-strike' ? (
                                <MdImpexStrikePage
                                    currentUser={currentUser as any}
                                    users={users}
                                    tasks={tasks}
                                    isOverdue={isOverdueFn}
                                />
                            ) : currentView === 'md-impex-manual-strike' ? (
                                <NewMdImpexStrikePage
                                    currentUser={currentUser as any}
                                    users={users}
                                />
                            ) : currentView === 'md-impex-access' ? (
                                <MdImpexAccessPage
                                    allBrands={apiBrands}
                                    allTaskTypes={taskTypes}
                                />
                            ) : currentView === 'all-tasks' ? (
                                <AllTasksPage
                                    tasks={tasks}
                                    filter={filters.status}
                                    setFilter={(value) => handleFilterChange('status', value)}
                                    dateFilter={filters.date}
                                    setDateFilter={(value) => handleFilterChange('date', value)}
                                    assignedFilter={filters.assigned}
                                    setAssignedFilter={(value) => handleFilterChange('assigned', value)}
                                    advancedFilters={filters}
                                    onAdvancedFilterChange={(filterType: string, value: string) =>
                                        handleFilterChange(filterType as keyof FilterState, value)
                                    }
                                    onResetFilters={resetFilters}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    currentUser={currentUser}
                                    users={users}
                                    onEditTask={async (taskId: string, updatedTask: Partial<Task>) => {
                                        return await handleUpdateTask(taskId, updatedTask);
                                    }}
                                    onDeleteTask={handleDeleteTask}
                                    formatDate={formatDate}
                                    isOverdue={isOverdueFn}
                                    getTaskBorderColor={getTaskBorderColor}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    onToggleTaskStatus={handleToggleTaskStatus}
                                    onCreateTask={async () => {
                                        if (!canCreateTasks) {
                                            toast.error('You do not have permission to create tasks');
                                            return undefined;
                                        }
                                        openAddTaskModal();
                                        return undefined;
                                    }}
                                    onSaveComment={handleSaveComment}
                                    onDeleteComment={handleDeleteComment}
                                    onFetchTaskComments={handleFetchTaskComments}
                                    onReassignTask={handleReassignTask}
                                    onMdImpexReassignTask={handleMdImpexReassignTask}
                                    onAddTaskHistory={handleAddTaskHistory}
                                    onApproveTask={handleApproveTask}
                                    onUpdateTaskApproval={handleUpdateTaskApproval}
                                    onFetchTaskHistory={handleFetchTaskHistory}
                                    onBulkCreateTasks={handleBulkCreateTasks}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    brands={brands}
                                    showEditModal={showEditTaskModal}
                                    editingTask={editingTask}
                                    onOpenEditModal={handleOpenEditModal}
                                    onCloseEditModal={() => setShowEditTaskModal(false)}
                                    onSaveEditedTask={handleSaveEditedTask}
                                />
                            ) : currentView === 'assigned-by-me' ? (
                                <AssignedByMe
                                    currentUser={currentUser as any}
                                    users={users as any}
                                    brands={brands as any}
                                    getTaskBorderColor={getTaskBorderColor}
                                    formatDate={formatDate}
                                    isOverdue={isOverdueFn}
                                    onApproveTask={handleApproveTask}
                                    onUpdateTaskApproval={handleUpdateTaskApproval}
                                    advancedFilters={filters}
                                    onAdvancedFilterChange={(filterType: string, value: string) =>
                                        handleFilterChange(filterType as keyof FilterState, value)
                                    }
                                    onEditTask={handleOpenEditModal}
                                    onViewHistory={handleOpenTaskHistorySidebar}
                                    onOpenComments={handleOpenTaskCommentSidebar}
                                    onSaveComment={handleSaveComment}
                                    onDeleteComment={handleDeleteComment}
                                    onFetchTaskComments={handleFetchTaskComments}
                                    onFetchTaskHistory={handleFetchTaskHistory}
                                    onToggleTaskStatus={handleToggleTaskStatus}
                                />
                            ) : currentView === 'assigned-to-me' ? (
                                <AssignedToMe
                                    currentUser={currentUser as any}
                                    users={users as any}
                                    brands={brands as any}
                                    getTaskBorderColor={getTaskBorderColor}
                                    formatDate={formatDate}
                                    isOverdue={isOverdueFn}
                                    onApproveTask={handleApproveTask}
                                    onUpdateTaskApproval={handleUpdateTaskApproval}
                                    advancedFilters={filters}
                                    onAdvancedFilterChange={(filterType: string, value: string) =>
                                        handleFilterChange(filterType as keyof FilterState, value)
                                    }
                                    onEditTask={handleOpenEditModal}
                                    onViewHistory={handleOpenTaskHistorySidebar}
                                    onOpenComments={handleOpenTaskCommentSidebar}
                                    onSaveComment={handleSaveComment}
                                    onDeleteComment={handleDeleteComment}
                                    onFetchTaskComments={handleFetchTaskComments}
                                    onFetchTaskHistory={handleFetchTaskHistory}
                                    onToggleTaskStatus={handleToggleTaskStatus}
                                />
                            ) : currentView === 'personal-tasks' ? (
                                <PersonalTasksPage currentUser={currentUser} />
                            ) : currentView === 'calendar' ? (
                                <CalendarView
                                    tasks={tasks}
                                    currentUser={{
                                        id: currentUser.id || '',
                                        name: currentUser.name || 'User',
                                        email: currentUser.email || '',
                                        role: currentUser.role || 'user',
                                        avatar: currentUser.avatar || 'U'
                                    }}
                                    handleToggleTaskStatus={async (taskId: string, currentStatus: TaskStatus) => {
                                        try {
                                            await handleToggleTaskStatus(taskId, currentStatus, false);
                                        } catch (error) {
                                            toast.error('Failed to update task status');
                                        }
                                    }}
                                    handleDeleteTask={async (taskId: string) => {
                                        try {
                                            await handleDeleteTask(taskId);
                                        } catch (error) {
                                            toast.error('Failed to delete task');
                                        }
                                    }}
                                    handleUpdateTask={async (taskId: string, updatedData: Partial<Task>) => {
                                        try {
                                            await handleUpdateTask(taskId, updatedData);
                                        } catch (error) {
                                            toast.error('Failed to update task');
                                        }
                                    }}
                                    canEditTask={canEditTask}
                                    canDeleteTaskForTask={canEditDeleteTask}
                                    canMarkTaskDone={canMarkTaskDone}
                                    getAssignedUserInfo={getAssignedUserInfo}
                                    formatDate={formatDate}
                                    isOverdue={isOverdueFn}
                                    canDeleteTask={(() => {
                                        const role = String((currentUser as any)?.role || '').trim().toLowerCase();
                                        return role !== 'rm' && role !== 'am';
                                    })()}
                                />
                            ) : currentView === 'analyze' ? (
                                <Suspense fallback={
                                    <div className="flex items-center justify-center p-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        <span className="ml-3 text-gray-600 font-medium">Loading Analytics...</span>
                                    </div>
                                }>
                                    <AnalyzePage
                                        tasks={tasks}
                                        users={users}
                                        apiCompanies={availableCompanies}
                                        currentUserEmail={currentUser?.email}
                                        currentUserRole={currentUser?.role}
                                    />
                                </Suspense>
                            ) : currentView === 'team' ? (
                                <TeamPage
                                    users={users}
                                    tasks={tasks}
                                    onUpdateUser={handleUpdateUser}
                                    onDeleteUser={handleDeleteUser}
                                    onAddUser={handleCreateUser}
                                    isOverdue={isOverdueFn}
                                    currentUser={currentUser}
                                    onFetchTaskHistory={handleFetchTaskHistory}
                                />
                            ) : currentView === 'profile' ? (
                                <UserProfilePage
                                    user={currentUser}
                                    formatDate={formatDate}
                                    onUserUpdated={(next) => {
                                        try {
                                            setCurrentUser(next);
                                        } catch {
                                            // ignore
                                        }
                                        try {
                                            const nextId = (next as any)?.id || (next as any)?._id;
                                            if (next) {
                                                dispatch(userUpserted({ ...next, id: nextId } as UserType));
                                            }
                                        } catch {
                                            // ignore
                                        }
                                        try {
                                            localStorage.setItem('currentUser', JSON.stringify(next));
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                />
                            ) : currentView === 'access' ? (
                                <AccessPage
                                    currentUser={currentUser}
                                    users={users}
                                    onAddUser={handleCreateUser}
                                    onRefreshCurrentUser={fetchCurrentUser}
                                />
                            ) : currentView === 'company-brand-task-types' ? (
                                <CompanyBrandTaskTypePage
                                    currentUser={currentUser}
                                />
                            ) : currentView === 'assign' ? (
                                <AssignPage
                                    currentUser={currentUser}
                                />
                            ) : currentView === 'speed-ecom-reassign' ? (
                                <SpeedEcomReassignPage
                                    task={speedEcomReassignTask}
                                    currentUser={currentUser}
                                    users={users}
                                    onSubmit={handleSpeedEcomReassignSubmit}
                                    isSubmitting={isSpeedEcomReassignSubmitting}
                                />
                            ) : currentView === 'reviews' ? (
                                <ReviewsPage
                                    currentUser={currentUser}
                                    users={users}
                                />
                            ) : currentView === 'other-work' ? (
                                <OtherWorkPage
                                    currentUser={currentUser}
                                    tasks={tasks}
                                    onRefreshTasks={fetchTasks}
                                />
                            ) : currentView === 'brands' ? (
                                <BrandsListPage
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    currentUser={currentUser}
                                    tasks={tasks}
                                    socket={socketRef.current}
                                    onSelectBrand={(brandId) => {
                                        const nextId = String(brandId || '').trim();
                                        if (!nextId) return;
                                        setSelectedBrandId(nextId);
                                        setCurrentView('brand-detail');
                                        try {
                                            navigate(`/brands/${encodeURIComponent(nextId)}`);
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                />
                            ) : currentView === 'brand-detail' ? (
                                <BrandDetailPage
                                    brandId={selectedBrandId || ''}
                                    brands={apiBrands}
                                    currentUser={currentUser}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    onBack={() => {
                                        setCurrentView('brands');
                                        setSelectedBrandId(null);
                                        try {
                                            navigate(routepath.brands);
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                    tasks={tasks}
                                    availableUsers={users}
                                />
                            ) : currentView === 'headline' ? (
                                <AdminHeadlineManager />
                            ) : currentView === 'manager-monthly-rankings' ? (
                                <ManagerMonthlyRankingPage currentUser={currentUser} />
                            ) : currentView === 'brands' ? (
                                <BrandsListPage
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    currentUser={currentUser}
                                    tasks={tasks}
                                    socket={socketRef.current}
                                    onSelectBrand={(brandId) => {
                                        setSelectedBrandId(brandId);
                                        setCurrentView('brand-detail');
                                    }}
                                />
                            ) : currentView === 'brand-detail' ? (
                                <BrandDetailPage
                                    brandId={selectedBrandId || ''}
                                    brands={apiBrands}
                                    currentUser={currentUser}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    onBack={() => setCurrentView('brands')}
                                    tasks={tasks}
                                />
                            ) : null}
                        </div>
                    </div>
                </main>
            </div>
            {(() => {
                const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
                const currentUserRole = String((currentUser as any)?.role || '').trim().toLowerCase();
                const isMdImpexUser = (currentUserCompany.includes('mdimpex') ||
                    currentUserCompany.includes('md_impex') ||
                    currentUserCompany.includes('md impex') ||
                    currentUserRole === 'md_manager' ||
                    currentUserRole === 'assistant' ||
                    currentUserRole === 'assistance') && 
                    currentUserRole !== 'admin' && 
                    currentUserRole !== 'super_admin';
                if (isMdImpexUser) {
                    return (
                        <MdImpexAddTaskModal
                            open={showAddTaskModal}
                            onClose={() => setShowAddTaskModal(false)}
                            newTask={newTask}
                            formErrors={formErrors}
                            onChange={handleInputChange}
                            availableCompanies={availableCompaniesForSbm}
                            getAvailableBrandOptions={getAvailableBrandOptions}
                            availableTaskTypesForNewTask={availableTaskTypesForNewTask}
                            onSubmit={handleSaveTaskFromModal}
                            isSubmitting={isCreatingTask}
                            currentUserEmail={String(currentUser?.email || '')}
                            currentUserRole={String(currentUser?.role || '')}
                            currentUserId={String((currentUser as any)?.id || (currentUser as any)?._id || '')}
                            canBulkAddTaskTypes={canBulkAddTaskTypes}
                            onBulkAddTaskTypes={handleAddTaskTypeClick}
                        />
                    );
                }
                return (
                    <AddTaskModal
                        open={showAddTaskModal}
                        onClose={() => setShowAddTaskModal(false)}
                        newTask={newTask}
                        formErrors={formErrors}
                        onFieldChange={handleInputChange}
                        users={usersForAddTaskModal}
                        availableCompanies={availableCompaniesForSbm}
                        canBulkAddCompanies={canBulkAddCompanies}
                        onBulkAddCompanies={handleAddCompanyClick}
                        canCreateBrand={canCreateBrand}
                        canBulkAddBrands={canBulkAddBrands}
                        onAddBrand={handleAddBrandClick}
                        availableBrandOptions={availableBrandOptions}
                        canBulkAddTaskTypes={canBulkAddTaskTypes}
                        onBulkAddTaskTypes={handleAddTaskTypeClick}
                        availableTaskTypesForNewTask={availableTaskTypesForNewTask}
                        onSubmit={handleSaveTaskFromModal}
                        isSubmitting={isCreatingTask}
                        isSbmUser={isSbmUser}
                        showCompanyDropdownIcon={true}
                    />
                );
            })()}
            <EditTaskModal
                open={showEditTaskModal}
                editingTask={editingTask}
                onClose={() => setShowEditTaskModal(false)}
                editFormData={editFormData}
                editFormErrors={editFormErrors}
                onChange={handleEditInputChange}
                users={users}
                availableTaskTypesForEditTask={availableTaskTypesForEditTask}
                availableCompanies={availableCompanies}
                getEditFormBrandOptions={getEditFormBrandOptions}
                onSubmit={handleSaveEditedTask}
                isSubmitting={isUpdatingTask}
                disableDueDate={true}
                currentUserEmail={(currentUser as any)?.email || ''}
                currentUser={currentUser as any}
            />
            <MdImpexEditTaskModal
                open={showMdImpexEditModal}
                editingTask={editingTask}
                currentUser={currentUser as any}
                currentUserEmail={(currentUser as any)?.email || ''}
                onClose={() => setShowMdImpexEditModal(false)}
                onSubmit={handleSaveEditedTask}
                users={users}
                editFormData={editFormData}
                editFormErrors={editFormErrors}
                onChange={handleEditInputChange}
                availableTaskTypesForEditTask={availableTaskTypesForEditTask}
                availableCompanies={availableCompanies}
                getEditFormBrandOptions={getEditFormBrandOptions}
                isSubmitting={isUpdatingTask}
                disableDueDate={false}
            />
            <BulkAddBrandsModal
                open={canBulkAddBrands && showBulkBrandModal}
                onClose={() => setShowBulkBrandModal(false)}
                bulkBrandForm={bulkBrandForm}
                setBulkBrandForm={(next) => setBulkBrandForm(next)}
                availableCompanies={availableCompaniesForSbm}
                companyUsers={companyUsers}
                currentUserRole={(currentUser as any)?.role}
                onSubmit={handleSubmitBulkBrands}
                isSubmitting={isCreatingBulkBrands}
            />
            <BulkAddCompaniesModal
                open={canBulkAddCompanies && showBulkCompanyModal}
                onClose={() => setShowBulkCompanyModal(false)}
                bulkCompanyNames={bulkCompanyNames}
                setBulkCompanyNames={(next) => setBulkCompanyNames(next)}
                onSubmit={handleSubmitBulkCompanies}
                isSubmitting={isCreatingBulkCompanies}
            />
            <BulkAddTaskTypesModal
                open={canBulkAddTaskTypes && showBulkTaskTypeModal}
                onClose={() => {
                    setShowBulkTaskTypeModal(false);
                    setBulkTaskTypeCompany('');
                }}
                bulkTaskTypeCompany={bulkTaskTypeCompany}
                setBulkTaskTypeCompany={(next) => setBulkTaskTypeCompany(next)}
                bulkTaskTypeNames={bulkTaskTypeNames}
                setBulkTaskTypeNames={(next) => setBulkTaskTypeNames(next)}
                availableCompanies={availableCompaniesForSbm}
                onSubmit={handleSubmitBulkTaskTypes}
                isSubmitting={isCreatingBulkTaskTypes}
            />
            <ManagerAddBrandModal
                open={showManagerAddBrandModal}
                managerBrandName={managerBrandName}
                setManagerBrandName={(next) => setManagerBrandName(next)}
                isSubmitting={isCreatingManagerBrand}
                onSubmit={() => handleManagerCreateBrand()}
                onClose={() => setShowManagerAddBrandModal(false)}
            />

            {/* Mobile Bottom Navigation - "Beast" UX */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 px-6 py-2.5 flex items-center justify-between z-40 pb-safe">
                <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <Home className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button
                    onClick={() => setCurrentView('all-tasks')}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'all-tasks' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <ListTodo className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Tasks</span>
                </button>

                {/* Space for FAB */}
                <div className="w-12 h-10" />

                {hasAccess('reports_analytics') && (
                    <button
                        onClick={() => navigateTo('analyze')}
                        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'analyze' ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-[10px] font-bold">Analyze</span>
                    </button>
                )}
                <button
                    onClick={() => setCurrentView('profile')}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <User className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
            </div>

            {/* Mobile FAB for Add Task */}
            {canCreateTasks && (
                <button
                    onClick={() => openAddTaskModal()}
                    className="lg:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 active:scale-90 transition-all border-4 border-white"
                    aria-label="Add Task"
                >
                    <PlusCircle className="h-7 w-7" />
                </button>
            )}
        </div>
    );
};

export default DashboardPage;
