import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Users,
    ChevronRight,
    Shield,
    Mail,
    Save,
    X,
    Eye,
    EyeOff,
    UserCog,
    User,
    Briefcase,
    UserPlus,
    LayoutGrid,
    List,
} from 'lucide-react';
import type { Task, TaskHistory, UserType } from '../Types/Types';
import toast from 'react-hot-toast';
import TeamDetailsPage from './TeamDetailsPage';
import { TeamPageSkeleton } from '../Components/LoadingSkeletons';
import { authService } from '../Services/User.Services';
import { taskService } from '../Services/Task.services';
import { accessService } from '../Services/Access.Services';
import mdImpexAccessService from '../Services/MdImpexAccess.services';
import { userAvatarUrl } from '../utils/avatar';
import { companyService, type Company } from '../Services/Company.service';
import { routepath } from '../Routes/route';
import { useAppSelector } from '../Store/hooks';
import { selectAllUsers } from '../Store/usersSlice';
import { selectAllTasks } from '../Store/tasksSlice';

interface TeamPageProps {
    users?: UserType[];
    tasks?: Task[];
    onDeleteUser?: (userId: string) => Promise<void>;
    onAddUser?: (newUser: Partial<UserType>) => Promise<void>;
    onUpdateUser?: (userId: string, updatedUser: Partial<UserType>) => Promise<void>;
    isOverdue?: (dueDate: string, status: string) => boolean;
    currentUser?: UserType;
    onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
}

type RoleItem = {
    key: string;
    name: string;
};

// Theme colors
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

const TeamPage: React.FC<TeamPageProps> = (props) => {
    const navigate = useNavigate();
    const accessDeniedRef = useRef(false);
    const {
        users: usersProp,
        tasks: tasksProp,
        onDeleteUser,
        onAddUser,
        onUpdateUser,
        isOverdue = () => false,
        currentUser: currentUserProp,
        onFetchTaskHistory,
    } = props;

    const hasExternalUsers = typeof usersProp !== 'undefined';
    const hasExternalTasks = typeof tasksProp !== 'undefined';
    const hasExternalCurrentUser = useMemo(() => {
        if (typeof currentUserProp === 'undefined') return false;
        try {
            return Boolean(currentUserProp && Object.keys(currentUserProp).length > 0);
        } catch {
            return false;
        }
    }, [currentUserProp]);

    const [internalUsers, setInternalUsers] = useState<UserType[]>([]);
    const [internalUsersLoading, setInternalUsersLoading] = useState(!hasExternalUsers);
    const [internalTasks, setInternalTasks] = useState<Task[]>([]);
    const [internalTasksLoading, setInternalTasksLoading] = useState(!hasExternalTasks);
    const [internalCurrentUser, setInternalCurrentUser] = useState<UserType | null>(null);
    const [internalCurrentUserLoading, setInternalCurrentUserLoading] = useState(!hasExternalCurrentUser);

    const effectiveCurrentUser = useMemo(() => {
        return (hasExternalCurrentUser ? (currentUserProp || null) : internalCurrentUser) as any;
    }, [currentUserProp, hasExternalCurrentUser, internalCurrentUser]);

    useEffect(() => {
        if (!effectiveCurrentUser) return;
        const name = String((effectiveCurrentUser as any)?.name || '').trim().toLowerCase();
        const email = String((effectiveCurrentUser as any)?.email || '').trim().toLowerCase();
        const id = String((effectiveCurrentUser as any)?.id || (effectiveCurrentUser as any)?._id || '').trim();
        if (!id || !email || name === 'loading...') return;
        const role = String((effectiveCurrentUser as any)?.role || '').toLowerCase();
        if (role === 'admin' || role === 'super_admin') return;
        const perms = (effectiveCurrentUser as any)?.permissions;
        if (!perms || typeof perms !== 'object') return;
        if (typeof perms.team_page === 'undefined') return;
        const teamPermission = String(perms.team_page || '').toLowerCase();
        if (teamPermission === 'deny') {
            if (accessDeniedRef.current) return;
            accessDeniedRef.current = true;
            toast.error('Access denied');
            navigate(routepath.dashboard);
        }
    }, [effectiveCurrentUser, navigate]);

    useEffect(() => {
        const fetchStandaloneCurrentUser = async () => {
            if (hasExternalCurrentUser) return;
            setInternalCurrentUserLoading(true);
            try {
                const res = await authService.getCurrentUser();
                if (res?.success && res.data) {
                    setInternalCurrentUser(res.data as UserType);
                }
            } finally {
                setInternalCurrentUserLoading(false);
            }
        };
        fetchStandaloneCurrentUser();
    }, [hasExternalCurrentUser]);

    useEffect(() => {
        const fetchStandaloneUsers = async () => {
            if (hasExternalUsers) return;
            setInternalUsersLoading(true);
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
                const normalized = (rawUsers || []).map((u: any) => {
                    const id = u?.id || u?._id || u?.userId || u?.userid || '';
                    return { ...u, id } as UserType;
                });
                setInternalUsers(normalized);
            } catch {
                // ignore
            } finally {
                setInternalUsersLoading(false);
            }
        };
        fetchStandaloneUsers();
    }, [hasExternalUsers]);

    useEffect(() => {
        const fetchStandaloneTasks = async () => {
            if (hasExternalTasks) return;
            setInternalTasksLoading(true);
            try {
                const res = await taskService.getAllTasks();
                if (res?.success && Array.isArray(res.data)) {
                    setInternalTasks(res.data as Task[]);
                }
            } finally {
                setInternalTasksLoading(false);
            }
        };
        fetchStandaloneTasks();
    }, [hasExternalTasks]);

    const reduxUsers = useAppSelector(selectAllUsers);
    const reduxTasks = useAppSelector(selectAllTasks);

    const users = useMemo(() => {
        if (hasExternalUsers) return usersProp || [];
        if (reduxUsers.length > 0) return reduxUsers;
        return internalUsers;
    }, [hasExternalUsers, internalUsers, reduxUsers, usersProp]);

    const tasks = useMemo(() => {
        if (hasExternalTasks) return tasksProp || [];
        if (reduxTasks.length > 0) return reduxTasks;
        return internalTasks;
    }, [hasExternalTasks, internalTasks, reduxTasks, tasksProp]);

    const currentUser = useMemo(() => {
        return hasExternalCurrentUser ? (currentUserProp as UserType) : (internalCurrentUser || ({} as UserType));
    }, [hasExternalCurrentUser, currentUserProp, internalCurrentUser]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [newUser, setNewUser] = useState<{
        name: string;
        email: string;
        role: string;
        password: string;
        department: string;
        position: string;
        phone: string;
        managerId?: string;
        companyName?: string;
    }>({
        name: '',
        email: '',
        role: 'assistant',
        password: '',
        department: '',
        position: '',
        phone: '',
        managerId: undefined,
        companyName: ''
    });
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [addingUser, setAddingUser] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterCompany, setFilterCompany] = useState<string>('all');
    const [sortBy,] = useState<'name' | 'role' | 'tasks' | 'completion'>('name');
    const [sortOrder,] = useState<'asc' | 'desc'>('asc');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [, setIsLoadingDetails] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('teamPageViewMode') as 'grid' | 'list') || 'grid';
    });
    useEffect(() => {
        localStorage.setItem('teamPageViewMode', viewMode);
    }, [viewMode]);

    const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companiesLoading, setCompaniesLoading] = useState(false);

    const [addAdminId, setAddAdminId] = useState<string>('');
    const [addSbmId, setAddSbmId] = useState<string>('');
    const [addRmId, setAddRmId] = useState<string>('');

    const openUserDetails = useCallback((userId: string) => {
        setIsLoadingDetails(true);
        setTimeout(() => {
            setSelectedUserId(userId);
            setIsLoadingDetails(false);
        }, 300);
    }, []);

    const normalizeRole = useCallback((role: unknown) => {
        return (role || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
    }, []);

    const normalizeText = useCallback((value: unknown) => {
        return (value == null ? '' : String(value))
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }, []);

    const isAdminLikeRole = useCallback((role: unknown) => {
        const r = normalizeRole(role);
        return r === 'admin' || r === 'super_admin';
    }, [normalizeRole]);

    const currentUserRole = useMemo(() => {
        return normalizeRole(currentUser?.role || '');
    }, [currentUser, normalizeRole]);

    const isCurrentUserAdmin = useMemo(() => {
        return isAdminLikeRole(currentUserRole);
    }, [currentUserRole, isAdminLikeRole]);

    useEffect(() => {
        setFilterRole('all');
    }, [filterCompany]);

    useEffect(() => {
        if (isCurrentUserAdmin) return;
        const role = (currentUserRole || '').toString().trim().toLowerCase();
        if (role === 'sbm' || role === 'rm' || role === 'am') return;
        if (filterRole === 'sbm' || filterRole === 'rm' || filterRole === 'am') {
            setFilterRole('all');
        }
    }, [currentUserRole, filterRole, isCurrentUserAdmin]);

    const isCurrentUserSuperAdmin = useMemo(() => {
        return currentUserRole === 'super_admin';
    }, [currentUserRole]);

    const isCurrentUserManager = useMemo(() => {
        return currentUserRole === 'manager' || currentUserRole === 'marketer_manager';
    }, [currentUserRole]);

    const isCurrentUserMdManager = useMemo(() => {
        return currentUserRole === 'md_manager';
    }, [currentUserRole]);

    const isCurrentUserObManager = useMemo(() => {
        return currentUserRole === 'ob_manager';
    }, [currentUserRole]);

    const isCurrentUserSbm = useMemo(() => {
        return currentUserRole === 'sbm';
    }, [currentUserRole]);

    const isCurrentUserRm = useMemo(() => {
        return currentUserRole === 'rm';
    }, [currentUserRole]);

    const isCurrentUserAm = useMemo(() => {
        return currentUserRole === 'am';
    }, [currentUserRole]);

    const isCurrentUserSalesManager = useMemo(() => {
        return currentUserRole === 'sales_manager';
    }, [currentUserRole]);

    const isCurrentUserSalesMan = useMemo(() => {
        return currentUserRole === 'sales_man';
    }, [currentUserRole]);

    const currentUserIdValue = useMemo(() => {
        return (currentUser?.id || (currentUser as any)?._id || '').toString();
    }, [currentUser]);

    const isCurrentUserTroubleshootManager = useMemo(() => {
        return currentUserRole === 'troubleshoot_manager';
    }, [currentUserRole]);

    const canViewTeamPage = useMemo(() => {
        return isCurrentUserAdmin
            || isCurrentUserMdManager
            || isCurrentUserObManager
            || isCurrentUserManager
            || isCurrentUserSbm
            || isCurrentUserRm
            || isCurrentUserAm
            || isCurrentUserTroubleshootManager
            || isCurrentUserSalesManager
            || isCurrentUserSalesMan;
    }, [isCurrentUserAdmin, isCurrentUserAm, isCurrentUserMdManager, isCurrentUserObManager, isCurrentUserManager, isCurrentUserRm, isCurrentUserSbm, isCurrentUserTroubleshootManager, isCurrentUserSalesManager, isCurrentUserSalesMan]);

    useEffect(() => {
        if (!canViewTeamPage) return;
        if (isCurrentUserAdmin || isCurrentUserMdManager) return;
        const userCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();
        if (!userCompany) return;
        const currentKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
        const desiredKey = normalizeText(userCompany);
        if (!desiredKey) return;
        if (currentKey === desiredKey) return;
        setFilterCompany(userCompany);
    }, [canViewTeamPage, currentUser, filterCompany, isCurrentUserAdmin, normalizeText]);

    const canManageUsers = useMemo(() => {
        return isCurrentUserAdmin || isCurrentUserMdManager || isCurrentUserObManager;
    }, [isCurrentUserAdmin, isCurrentUserMdManager, isCurrentUserObManager]);

    const canManageUsersAsManager = useMemo(() => {
        return isCurrentUserManager || isCurrentUserSbm || isCurrentUserRm;
    }, [isCurrentUserManager, isCurrentUserSbm, isCurrentUserRm]);

    const normalizeCompanyKey = useCallback((value: unknown): string => {
        return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '');
    }, []);

    const getCompanyNameFromUser = useCallback((user: any): string => {
        if (!user) return '';
        const resolveFromCompanies = (rawId: any): string => {
            const id = String(rawId || '').trim();
            if (!id) return '';
            const list = Array.isArray(companies) ? companies : [];
            const match = list.find((c: any) => {
                const cid = String((c as any)?._id || (c as any)?.id || '').trim();
                return cid && cid === id;
            });
            return String((match as any)?.name || '').trim();
        };
        const direct = user?.companyName || user?.company;
        if (typeof direct === 'string') return direct;
        if (direct && typeof direct === 'object') {
            const candidate = (direct as any)?.name
                || (direct as any)?.companyName
                || (direct as any)?.title;
            if (typeof candidate === 'string') return candidate;
        }
        const fallbackCandidate = user?.company?.name || user?.company?.companyName || user?.company?.title;
        if (typeof fallbackCandidate === 'string') return fallbackCandidate;
        const maybeId = user?.companyId || user?.company?._id || user?.company?.id || user?.company;
        const resolvedFromId = resolveFromCompanies(maybeId);
        if (resolvedFromId) return resolvedFromId;
        return '';
    }, [companies]);

    const isSpeedEcomUser = useCallback((user: any): boolean => {
        const companyName = getCompanyNameFromUser(user);
        const key = normalizeCompanyKey(companyName);
        return key === 'speedecom';
    }, [getCompanyNameFromUser, normalizeCompanyKey]);

    const isSpeedEcomContext = useMemo(() => {
        const currentUserCompany = (currentUser as any)?.companyName || (currentUser as any)?.company || '';
        const currentUserKey = normalizeCompanyKey(currentUserCompany);
        if (currentUserKey === 'speedecom') return true;
        const filterKey = normalizeCompanyKey(filterCompany === 'all' ? '' : filterCompany);
        if (filterKey === 'speedecom') return true;
        return false;
    }, [currentUser, filterCompany, normalizeCompanyKey]);

    const canManageTargetUser = useCallback((target: UserType): boolean => {
        const targetId = (target?.id || (target as any)?._id || '').toString();
        if (!targetId) return false;
        if (isCurrentUserAdmin) return true;
        if (isCurrentUserMdManager) {
            const targetRole = normalizeRole(target?.role);
            // MD Manager should be able to manage anyone except super_admin
            if (targetRole === 'super_admin') return false;
            return true;
        }
        if (isCurrentUserObManager) {
            const targetRole = normalizeRole(target?.role);
            const isAssistantLike = targetRole === 'assistant'
                || targetRole === 'assistance'
                || targetRole === 'assistence'
                || targetRole === 'assistece'
                || targetRole === 'sub_assistance'
                || targetRole === 'sub_assistence'
                || targetRole === 'sub_assistece'
                || targetRole === 'sub_assist'
                || targetRole === 'sub_assistant'
                || targetRole.includes('assistant');
            if (!isAssistantLike) return false;
            return true;
        }
        if (isCurrentUserManager) {
            const targetRole = normalizeRole(target?.role);
            if (targetRole !== 'assistant') return false;
            return true;
        }
        if (isCurrentUserSbm) {
            const targetRole = normalizeRole(target?.role);
            if (targetRole !== 'rm' && targetRole !== 'am' && targetRole !== 'sales_manager' && targetRole !== 'sales_man') return false;
            return true;
        }
        if (isCurrentUserAm) {
            return isSpeedEcomUser(target);
        }
        if (isCurrentUserRm) {
            const targetRole = normalizeRole(target?.role);
            if (targetRole !== 'am') return false;
            return true;
        }
        return false;
    }, [currentUserIdValue, currentUser, isCurrentUserAdmin, isCurrentUserAm, isCurrentUserMdManager, isCurrentUserObManager, isCurrentUserManager, isCurrentUserRm, isCurrentUserSbm, isSpeedEcomUser, normalizeRole]);

    const getUserIdValue = useCallback((value: any): string => {
        return (value?.id || value?._id || value || '').toString();
    }, []);

    const usersById = useMemo(() => {
        const map = new Map<string, UserType>();
        const list = ((users && users.length ? users : internalUsers) || []) as UserType[];
        list.forEach((u) => {
            const id = (u?.id || (u as any)?._id || '').toString();
            const oid = ((u as any)?._id || '').toString();
            if (id) map.set(id, u);
            if (oid) map.set(oid, u);
        });
        return map;
    }, [internalUsers, users]);

    const getRoleLabel = useCallback((role: unknown) => {
        const r = normalizeRole(role);
        if (!r) return '';
        if (r === 'super_admin') return 'Super Admin';
        if (r === 'admin') return 'Admin';
        if (r === 'md_manager') return 'MD Manager';
        if (r === 'ob_manager') return 'OB Manager';
        if (r === 'manager') return 'Manager';
        if (r === 'sbm') return 'SBM';
        if (r === 'rm') return 'RM';
        if (r === 'am') return 'AM';
        if (r === 'assistant') return 'Assistant';
        if (r === 'sub_assistance') return 'Sub Assistance';
        if (r === 'sales_manager') return 'Sales Manager';
        if (r === 'sales_man') return 'Sales Man';
        return (role || '').toString();
    }, [normalizeRole]);

    const getRoleBadgeColor = useCallback((role: unknown) => {
        const r = normalizeRole(role);
        switch (r) {
            case 'super_admin':
                return 'bg-purple-100 text-purple-800';
            case 'admin':
                return 'bg-purple-100 text-purple-800';
            case 'md_manager':
                return `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`;
            case 'ob_manager':
                return `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`;
            case 'manager':
                return `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`;
            case 'troubleshoot_manager':
                return `bg-[${theme.primaryUltralight}] text-[${theme.primaryDark}]`;
            case 'sbm':
                return 'bg-amber-100 text-amber-800';
            case 'rm':
                return 'bg-amber-100 text-amber-800';
            case 'am':
                return 'bg-amber-100 text-amber-800';
            case 'assistant':
                return 'bg-green-100 text-green-800';
            case 'sub_assistance':
                return 'bg-green-100 text-green-800';
            case 'sales_manager':
                return 'bg-indigo-100 text-indigo-800';
            case 'sales_man':
                return 'bg-indigo-100 text-indigo-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }, [normalizeRole]);

    const getRoleIcon = useCallback((role: unknown) => {
        const r = normalizeRole(role);
        if (r === 'super_admin' || r === 'admin') return <Shield className="h-3 w-3" />;
        if (r === 'md_manager' || r === 'ob_manager' || r === 'manager' || r === 'troubleshoot_manager') return <UserCog className="h-3 w-3" />;
        if (r === 'sbm' || r === 'rm' || r === 'am') return <Briefcase className="h-3 w-3" />;
        if (r === 'assistant' || r === 'sub_assistance') return <User className="h-3 w-3" />;
        if (r === 'sales_manager' || r === 'sales_man') return <Briefcase className="h-3 w-3" />;
        return <User className="h-3 w-3" />;
    }, [normalizeRole]);

    const getReportingChain = useCallback((user: UserType) => {
        const chain: UserType[] = [];
        const visited = new Set<string>();
        let currentManagerId = (user?.managerId || '').toString();
        let depth = 0;
        while (currentManagerId && depth < 20) {
            if (visited.has(currentManagerId)) break;
            visited.add(currentManagerId);
            const manager = usersById.get(currentManagerId);
            if (!manager) break;
            chain.push(manager);
            const nextId = (manager?.managerId || '').toString();
            currentManagerId = nextId;
            depth += 1;
        }
        return chain;
    }, [usersById]);

    const companyOptions = useMemo(() => {
        const fromCompanies = (companies || [])
            .map((c) => (c?.name || '').toString().trim())
            .filter(Boolean);
        const fromUsers = (users || [])
            .map((u) => ((u as any)?.companyName || (u as any)?.company || '').toString().trim())
            .filter(Boolean);
        const merged = [...fromCompanies, ...fromUsers];
        const uniq = new Map<string, string>();
        merged.forEach((name) => {
            const key = normalizeText(name);
            if (!key) return;
            if (!uniq.has(key)) uniq.set(key, name);
        });
        return Array.from(uniq.values()).sort((a, b) => a.localeCompare(b));
    }, [companies, normalizeText, users]);

    const isTeamCompanyForced = useMemo(() => {
        if (isCurrentUserAdmin) return false;
        const companyName = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();
        return Boolean(companyName);
    }, [currentUser, isCurrentUserAdmin]);

    const companyScopedUsers = useMemo(() => {
        const companyKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
        if (!companyKey) return (users || []);
        return (users || []).filter((u: UserType) => normalizeText((u as any)?.companyName || (u as any)?.company || '') === companyKey);
    }, [filterCompany, normalizeText, users]);

    const visibleUsers = useMemo(() => {
        const roleKey = normalizeRole(filterRole);
        if (!roleKey || roleKey === 'all') return companyScopedUsers;
        return companyScopedUsers.filter((u: UserType) => normalizeRole(u?.role) === roleKey);
    }, [companyScopedUsers, filterRole, normalizeRole]);

    const getUserStats = useCallback((userId: string, userEmail: string) => {
        const uid = (userId || '').toString();
        const mail = (userEmail || '').toString().trim().toLowerCase();
        const normalizeForMatch = (email: string): string => {
            const e = email.toLowerCase();
            const idx = e.indexOf('.deleted.');
            return idx >= 0 ? e.slice(0, idx) : e;
        };
        const targetEmail = normalizeForMatch(mail);
        const list = Array.isArray(tasks) ? tasks : [];
        let totalAssigned = 0;
        let completed = 0;
        let pending = 0;
        let overdue = 0;
        for (const t of list) {
            const assignedTo: any = (t as any)?.assignedTo;
            let assignedId = '';
            let assignedEmail = '';
            if (typeof assignedTo === 'string') {
                assignedId = assignedTo;
                assignedEmail = assignedTo.toLowerCase();
            } else if (assignedTo && typeof assignedTo === 'object') {
                assignedId = (assignedTo?.id || assignedTo?._id || '').toString();
                assignedEmail = (assignedTo?.email || '').toString().trim().toLowerCase();
            }
            if (!assignedEmail) {
                const assignedToUser: any = (t as any)?.assignedToUser;
                if (assignedToUser && typeof assignedToUser === 'object') {
                    assignedEmail = (assignedToUser?.email || '').toString().trim().toLowerCase();
                    if (!assignedId) assignedId = (assignedToUser?.id || assignedToUser?._id || '').toString();
                }
            }
            const assignedEmailBase = normalizeForMatch(assignedEmail);
            const matches = (uid && assignedId && assignedId.toString() === uid)
                || (targetEmail && assignedEmailBase && assignedEmailBase === targetEmail);
            if (!matches) continue;
            totalAssigned += 1;
            const statusRaw = ((t as any)?.status || '').toString();
            const status = statusRaw.trim().toLowerCase();
            if (status === 'completed') {
                completed += 1;
            } else if (isOverdue((t as any)?.dueDate, status)) {
                // count as overdue only for non-completed tasks that are overdue
                overdue += 1;
            } else {
                // any non-completed, non-overdue task is considered pending
                pending += 1;
            }
        }
        const completion = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
        return { totalAssigned, completed, pending, overdue, completion };
    }, [isOverdue, tasks]);

    const filteredAndSortedUsers = useMemo(() => {
        const term = (searchTerm || '').toString().trim().toLowerCase();
        const base = Array.isArray(visibleUsers) ? visibleUsers : [];
        const filtered = !term
            ? base
            : base.filter((u) => {
                const name = (u?.name || '').toString().toLowerCase();
                const email = (u?.email || '').toString().toLowerCase();
                const role = (u?.role || '').toString().toLowerCase();
                return name.includes(term) || email.includes(term) || role.includes(term);
            });
        const direction = sortOrder === 'asc' ? 1 : -1;
        const sorted = filtered.slice().sort((a, b) => {
            if (sortBy === 'name') {
                return direction * (a.name || '').localeCompare(b.name || '');
            }
            if (sortBy === 'role') {
                return direction * normalizeRole(a.role).localeCompare(normalizeRole(b.role));
            }
            if (sortBy === 'tasks') {
                const sa = getUserStats(a.id, a.email).totalAssigned;
                const sb = getUserStats(b.id, b.email).totalAssigned;
                return direction * (sa - sb);
            }
            if (sortBy === 'completion') {
                const sa = getUserStats(a.id, a.email).completion;
                const sb = getUserStats(b.id, b.email).completion;
                return direction * (sa - sb);
            }
            return 0;
        });
        return sorted;
    }, [getUserStats, normalizeRole, searchTerm, sortBy, sortOrder, visibleUsers]);

    const selectedAddRoleKey = useMemo(() => {
        return normalizeRole(newUser.role);
    }, [newUser.role, normalizeRole]);

    const canAssignRole = useCallback((roleKey: string) => {
        const requester = normalizeRole(currentUserRole);
        const target = normalizeRole(roleKey);
        if (!target) return false;
        if (target === 'super_admin') return false;
        if (requester === 'super_admin') return true;
        if (requester === 'admin') return target !== 'admin' && target !== 'super_admin';
        if (requester === 'md_manager') {
            return target !== 'super_admin';
        }
        if (requester === 'ob_manager') return target === 'assistant';
        if (requester === 'manager') return target === 'assistant';
        if (requester === 'sbm') return target === 'rm' || target === 'sales_manager' || target === 'sales_man';
        if (requester === 'rm') return target === 'am';
        if (requester === 'sales_manager') return target === 'sales_man';
        return false;
    }, [currentUserRole, normalizeRole, availableRoles]);

    const loadRoles = useCallback(async () => {
        setRolesLoading(true);
        try {
            const res = isCurrentUserMdManager
                ? await mdImpexAccessService.getAllRoles()
                : await accessService.getRoles();
            let list: any[] = [];
            if (isCurrentUserMdManager) {
                list = Array.isArray((res as any)?.data) ? (res as any).data : [];
                const speedEComKeywords = ['speed', 'ecom', 'speed_ecom', 'speedecom', 'speed-ecom'];
                list = list
                    .filter((r: any) => {
                        const roleName = (r.role || '').toLowerCase();
                        const roleKey = (r.roleKey || '').toLowerCase();
                        return !speedEComKeywords.some(keyword => roleName.includes(keyword) || roleKey.includes(keyword));
                    })
                    .map((r: any) => ({
                        key: normalizeRole(r.role),
                        name: r.role
                    }))
                    .filter((r: RoleItem) => Boolean(r.key));
            } else {
                list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? (res as any) : [];
                list = (list || [])
                    .map((r: any) => ({
                        key: String(r?.key || '').trim().toLowerCase(),
                        name: String(r?.name || r?.key || '').trim() || String(r?.key || '').trim(),
                    }))
                    .filter((r: RoleItem) => Boolean(r.key));
            }
            const fallback: RoleItem[] = [
                { key: 'admin', name: 'Admin' },
                { key: 'md_manager', name: 'MD Manager' },
                { key: 'ob_manager', name: 'OB Manager' },
                { key: 'manager', name: 'Manager' },
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
                { key: 'sales_manager', name: 'Sales Manager' },
                { key: 'sales_man', name: 'Sales Man' },
                { key: 'troubleshoot_manager', name: 'Troubleshoot Manager' },
            ];
            const merged = [...fallback, ...list];
            const uniq = new Map<string, RoleItem>();
            merged.forEach((r) => {
                const k = normalizeRole(r.key);
                if (!k) return;
                if (!uniq.has(k)) uniq.set(k, { key: k, name: r.name || r.key });
            });
            setAvailableRoles(Array.from(uniq.values()));
        } catch {
            setAvailableRoles([
                { key: 'admin', name: 'Admin' },
                { key: 'md_manager', name: 'MD Manager' },
                { key: 'ob_manager', name: 'OB Manager' },
                { key: 'manager', name: 'Manager' },
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
                { key: 'sales_manager', name: 'Sales Manager' },
                { key: 'sales_man', name: 'Sales Man' },
                { key: 'troubleshoot_manager', name: 'Troubleshoot Manager' },
            ]);
        } finally {
            setRolesLoading(false);
        }
    }, [normalizeRole, isCurrentUserMdManager]);

    const loadCompanies = useCallback(async () => {
        setCompaniesLoading(true);
        try {
            const role = normalizeRole(currentUserRole);
            const needsAllowedCompanies = role === 'ob_manager' || role === 'manager' || role === 'assistant' || role === 'sbm' || role === 'rm' || role === 'am';
            const res = needsAllowedCompanies
                ? await companyService.getAllowedCompanies()
                : await companyService.getCompanies();
            if (res?.success && Array.isArray(res.data)) {
                setCompanies(res.data as Company[]);
            } else {
                setCompanies([]);
            }
        } catch {
            setCompanies([]);
        } finally {
            setCompaniesLoading(false);
        }
    }, [currentUserRole, normalizeRole]);

    useEffect(() => {
        if (!canViewTeamPage) return;
        loadCompanies();
        if (!isCurrentUserAdmin && !isCurrentUserMdManager) return;
        loadRoles();
    }, [canViewTeamPage, isCurrentUserAdmin, isCurrentUserMdManager, loadCompanies, loadRoles]);

    const effectiveRoleOptions = useMemo(() => {
        if (!isCurrentUserAdmin && !isCurrentUserMdManager) return [];
        const filtered = (availableRoles || []).filter((r) => canAssignRole(r.key));
        const order = ['admin', 'md_manager', 'ob_manager', 'manager', 'sbm', 'rm', 'am', 'assistant'];
        const sorted = filtered.sort((a, b) => {
            const ia = order.indexOf(normalizeRole(a.key));
            const ib = order.indexOf(normalizeRole(b.key));
            if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            return (a.name || a.key).localeCompare(b.name || b.key);
        });
        return sorted;
    }, [currentUserRole, isCurrentUserAdmin, normalizeRole, availableRoles, canAssignRole]);

    const roleOptionsForAddModal = useMemo(() => {
        const role = normalizeRole(currentUserRole);
        if (isCurrentUserAdmin) return effectiveRoleOptions;
        if (role === 'md_manager') {
            return effectiveRoleOptions;
        }
        if (role === 'ob_manager') {
            return [
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
            ];
        }
        if (role === 'sbm') {
            return [{ key: 'rm', name: 'RM' }, { key: 'am', name: 'AM' }, { key: 'sales_manager', name: 'Sales Manager' }, { key: 'sales_man', name: 'Sales Man' }];
        }
        if (role === 'sales_manager') {
            return [{ key: 'sales_man', name: 'Sales Man' }];
        }
        if (role === 'rm') {
            return [{ key: 'am', name: 'AM' }];
        }
        return [{ key: 'assistant', name: 'Assistant' }];
    }, [currentUserRole, effectiveRoleOptions, isCurrentUserAdmin, availableRoles, normalizeRole]);

    const addModalUserPool = useMemo(() => {
        const companyKey = normalizeText((newUser.companyName || '').toString());
        if (!companyKey) return (users || []);
        return (users || []).filter((u) => normalizeText((u as any)?.companyName || (u as any)?.company || '') === companyKey);
    }, [newUser.companyName, normalizeText, users]);

    const adminCandidates = useMemo(() => {
        const admins = (addModalUserPool || []).filter((u) => normalizeRole(u?.role) === 'admin');
        if (!isCurrentUserSuperAdmin && normalizeRole(currentUserRole) === 'admin') {
            const myId = getUserIdValue(currentUser);
            return admins.filter((u) => getUserIdValue(u) === myId);
        }
        return admins;
    }, [addModalUserPool, currentUser, currentUserRole, getUserIdValue, isCurrentUserSuperAdmin, normalizeRole]);

    const sbmCandidates = useMemo(() => {
        return (addModalUserPool || [])
            .filter((u) => normalizeRole(u?.role) === 'sbm')
            .filter((u) => {
                if (!addAdminId) return true;
                return (u as any)?.managerId?.toString() === addAdminId;
            })
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [addAdminId, addModalUserPool, normalizeRole]);

    const salesManagerCandidates = useMemo(() => {
        return (addModalUserPool || [])
            .filter((u) => normalizeRole(u?.role) === 'sales_manager')
            .filter((u) => {
                if (!addSbmId) return true;
                return (u as any)?.managerId?.toString() === addSbmId;
            })
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [addModalUserPool, addSbmId, normalizeRole]);

    const rmCandidates = useMemo(() => {
        return (addModalUserPool || [])
            .filter((u) => normalizeRole(u?.role) === 'rm')
            .filter((u) => {
                if (!addSbmId) return true;
                return (u as any)?.managerId?.toString() === addSbmId;
            })
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [addModalUserPool, addSbmId, normalizeRole]);

    const rmCandidatesForEditing = useMemo(() => {
        const list = (users || internalUsers || []) as UserType[];
        return list
            .filter((u) => normalizeRole((u as any)?.role) === 'rm')
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [users, internalUsers, normalizeRole]);

    const canEditRoleForUser = useCallback((user: any): boolean => {
        if (!user) return false;
        const uid = (user?.id || user?._id || '').toString();
        const fullUser = (uid && usersById.get(uid)) ? usersById.get(uid) : user;
        if (isCurrentUserAdmin) return true;
        if (isCurrentUserMdManager) return true;
        if (isCurrentUserAm && (isSpeedEcomUser(fullUser) || isSpeedEcomContext)) return true;
        if (isCurrentUserSbm && (isSpeedEcomUser(fullUser) || isSpeedEcomContext)) return true;
        return false;
    }, [isCurrentUserAdmin, isCurrentUserMdManager, isCurrentUserAm, isCurrentUserSbm, isSpeedEcomContext, isSpeedEcomUser, usersById]);

    const managerCandidatesForEditing = useMemo(() => {
        if (!editingUser) return [];
        const role = normalizeRole((editingUser as any)?.role);
        const list = (users || internalUsers || []) as UserType[];
        const targetUserId = (editingUser as any)?.id || (editingUser as any)?._id || '';

        const validParentRoles = new Set<string>();
        if (role === 'manager' || role === 'troubleshoot_manager') {
            validParentRoles.add('md_manager');
            validParentRoles.add('admin');
        }
        if (role === 'assistant' || role === 'sub_assistance') {
            validParentRoles.add('md_manager');
            validParentRoles.add('manager');
            validParentRoles.add('admin');
        }
        if (role === 'am') {
            validParentRoles.add('rm');
        }
        if (role === 'rm') {
            validParentRoles.add('sbm');
        }
        if (role === 'sbm' || role === 'md_manager' || role === 'ob_manager') {
            validParentRoles.add('admin');
        }

        return list
            .filter((u) => {
                const uId = (u?.id || (u as any)?._id || '').toString();
                if (uId && uId === targetUserId.toString()) return false;
                return validParentRoles.has(normalizeRole(u?.role));
            })
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [editingUser, users, internalUsers, normalizeRole]);

    const getManagerLabelForRole = (role: string) => {
        const r = normalizeRole(role);
        if (r === 'am') return 'RM';
        if (r === 'rm') return 'SBM';
        if (r === 'manager' || r === 'troubleshoot_manager') return 'MD Manager';
        if (r === 'assistant' || r === 'sub_assistance') return 'Reporting Manager';
        if (r === 'sbm' || r === 'md_manager' || r === 'ob_manager') return 'Admin';
        return 'Manager';
    };

    const needsManagerDropdown = (role: string) => {
        const r = normalizeRole(role);
        return ['am', 'rm', 'manager', 'troubleshoot_manager', 'assistant', 'sub_assistance', 'sbm', 'md_manager', 'ob_manager'].includes(r);
    };

    const roleOptionsForEditModal = useMemo(() => {
        if (!editingUser) return [];
        const uid = (editingUser as any)?.id || (editingUser as any)?._id || '';
        const fullUser = (uid && usersById.get(uid.toString())) ? usersById.get(uid.toString()) : editingUser;
        if (isCurrentUserAdmin) return effectiveRoleOptions;
        if (isCurrentUserAm && (isSpeedEcomUser(fullUser) || isSpeedEcomContext)) {
            return [
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
            ];
        }
        if (isCurrentUserSbm && (isSpeedEcomUser(fullUser) || isSpeedEcomContext)) {
            return [
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
            ];
        }
        if (isCurrentUserMdManager) {
            return effectiveRoleOptions;
        }
        const currentRoleKey = normalizeRole((editingUser as any)?.role || '');
        return currentRoleKey ? [{ key: currentRoleKey, name: currentRoleKey.toUpperCase() }] : [];
    }, [editingUser, effectiveRoleOptions, isCurrentUserAdmin, isCurrentUserMdManager, isCurrentUserAm, isCurrentUserSbm, isSpeedEcomContext, isSpeedEcomUser, normalizeRole, usersById, availableRoles]);

    const handleAddClick = () => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to add users');
            return;
        }

        const defaultRole = (() => {
            if (currentUserRole === 'super_admin') return 'admin';
            if (currentUserRole === 'admin') return 'md_manager';
            if (currentUserRole === 'md_manager') return 'ob_manager';
            return 'assistant';
        })();

        const allowedRoleKeys = (roleOptionsForAddModal || []).map((r) => normalizeRole(r.key)).filter(Boolean);
        const defaultNormalized = normalizeRole(defaultRole);
        const initialRole = isCurrentUserManager
            ? 'assistant'
            : (allowedRoleKeys.includes(defaultNormalized)
                ? defaultRole
                : ((roleOptionsForAddModal?.[0]?.key as any) || defaultRole));

        const resolvedDefaultCompany = (() => {
            const fromUser = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
            if (fromUser) return fromUser;
            if (filterCompany && filterCompany !== 'all') return String(filterCompany).toString().trim();
            return '';
        })();

        const resolvedDefaultCompanyFromOptions = (() => {
            const raw = (resolvedDefaultCompany || '').toString().trim();
            if (!raw) return '';
            const key = normalizeText(raw);
            if (!key) return raw;
            const match = (companyOptions || []).find((name) => normalizeText(name) === key);
            return match || raw;
        })();

        setNewUser({
            name: '',
            email: '',
            role: initialRole,
            password: '',
            department: '',
            position: '',
            phone: '',
            managerId: undefined,
            companyName: (resolvedDefaultCompanyFromOptions as any)
        });

        setAddAdminId(!isCurrentUserSuperAdmin && currentUserRole === 'admin' ? getUserIdValue(currentUser) : '');
        setAddSbmId('');
        setAddRmId('');

        setShowPassword(false);
        setShowAddModal(true);
    };

    useEffect(() => {
        if (!showAddModal) return;
        setNewUser((prev) => {
            const existingRaw = ((prev as any)?.companyName || '').toString().trim();
            const options = Array.isArray(companyOptions) ? companyOptions : [];
            if (isTeamCompanyForced && options.length === 1) {
                const only = (options[0] || '').toString();
                if (only && only !== existingRaw) return { ...prev, companyName: only as any };
                if (only) return prev;
            }
            if (existingRaw) {
                if (options.includes(existingRaw)) return prev;
                const key = normalizeText(existingRaw);
                const match = key ? options.find((name) => normalizeText(name) === key) : '';
                if (match && match !== existingRaw) return { ...prev, companyName: match as any };
                return prev;
            }
            const fromUser = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
            const raw = fromUser || (filterCompany && filterCompany !== 'all' ? String(filterCompany).toString().trim() : '');
            if (!raw) return prev;
            const key = normalizeText(raw);
            const match = key ? options.find((name) => normalizeText(name) === key) : '';
            const next = match || raw;
            if (!next) return prev;
            return { ...prev, companyName: next as any };
        });
    }, [companyOptions, currentUser, filterCompany, isTeamCompanyForced, normalizeText, showAddModal]);

    const handleSaveNewUser = async () => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to add users');
            return;
        }

        if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUser.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (newUser.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setAddingUser(true);
        try {
            let resolvedManagerId = newUser.managerId;

            if (selectedAddRoleKey === 'sbm') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                resolvedManagerId = addAdminId;
            }

            if (selectedAddRoleKey === 'rm') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                if (!addSbmId) {
                    toast.error('Please select SBM');
                    return;
                }
                resolvedManagerId = addSbmId;
            }

            if (selectedAddRoleKey === 'am') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                if (!addSbmId) {
                    toast.error('Please select SBM');
                    return;
                }
                if (!addRmId) {
                    toast.error('Please select RM');
                    return;
                }
                resolvedManagerId = addRmId;
            }

            if (selectedAddRoleKey === 'sales_manager') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                if (!addSbmId) {
                    toast.error('Please select SBM');
                    return;
                }
                resolvedManagerId = addSbmId;
            }

            if (selectedAddRoleKey === 'sales_man') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                if (!addSbmId) {
                    toast.error('Please select SBM');
                    return;
                }
                const addSalesManagerId = (newUser as any).salesManagerId;
                if (!addSalesManagerId) {
                    toast.error('Please select Sales Manager');
                    return;
                }
                resolvedManagerId = addSalesManagerId;
            }

            if (selectedAddRoleKey === 'assistant') {
                resolvedManagerId = undefined;
            }

            const userData = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: isCurrentUserManager ? 'assistant' : newUser.role,
                department: newUser.department || '',
                position: newUser.position || '',
                phone: newUser.phone || '',
                managerId: resolvedManagerId,
                companyName: (newUser.companyName || '').toString(),
            };

            if (onAddUser) {
                await onAddUser(userData);
            }

            toast.success('User added successfully');
            setShowAddModal(false);
            setAddAdminId('');
            setAddSbmId('');
            setAddRmId('');
            setNewUser({
                name: '',
                email: '',
                role: isCurrentUserManager ? 'assistant' : 'user',
                password: '',
                department: '',
                position: '',
                phone: '',
                managerId: undefined,
                companyName: ''
            });
            setShowPassword(false);
        } catch (error: any) {
            console.error('Error adding user:');
            const apiMsg = error?.response?.data?.message || error?.response?.data?.msg;
            const msg = (apiMsg || error?.message || 'Failed to add user').toString();
            toast.error(msg);
        } finally {
            setAddingUser(false);
        }
    };

    const handleCancelAdd = () => {
        setShowAddModal(false);
        setAddAdminId('');
        setAddSbmId('');
        setAddRmId('');
        setNewUser({
            name: '',
            email: '',
            role: isCurrentUserManager ? 'assistant' : 'user',
            password: '',
            department: '',
            position: '',
            phone: '',
            managerId: undefined,
            companyName: ''
        });
        setShowPassword(false);
    };

    const handleEditClick = (user: UserType) => {
        const canEditAsAm = isCurrentUserAm && isSpeedEcomUser(user);
        if (!canManageUsers && !canManageUsersAsManager && !canEditAsAm) {
            toast.error('You do not have permission to edit users');
            return;
        }

        if (!canManageTargetUser(user)) {
            toast.error('You do not have permission to edit this user');
            return;
        }

        setEditingUser({ ...user });
        setShowEditModal(true);
    };

    const handleCancelEdit = () => {
        if (savingUserId) return;
        setShowEditModal(false);
        setEditingUser(null);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        const canEditAsAm = isCurrentUserAm && isSpeedEcomUser(editingUser);
        if (!canManageUsers && !canManageUsersAsManager && !canEditAsAm) {
            toast.error('You do not have permission to edit users');
            return;
        }

        if (!canManageTargetUser(editingUser)) {
            toast.error('You do not have permission to edit this user');
            return;
        }

        const userId = getUserIdValue(editingUser);
        if (!userId) {
            toast.error('Invalid user');
            return;
        }

        if (!editingUser.name?.trim() || !editingUser.email?.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editingUser.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setSavingUserId(userId);
        try {
            const isAmUser = normalizeRole((editingUser as any)?.role) === 'am';
            const prevManagerId = ((usersById.get(userId) as any)?.managerId || (usersById.get(String(userId)) as any)?.managerId || '').toString();
            const nextManagerId = ((editingUser as any)?.managerId || '').toString();

            const payload: Partial<UserType> = {
                name: editingUser.name,
                email: editingUser.email,
                department: editingUser.department,
                position: editingUser.position,
                phone: (editingUser as any)?.phone,
            };

            const roleChanged = normalizeRole((usersById.get(userId) as any)?.role) !== normalizeRole((editingUser as any)?.role);
            if (roleChanged && canEditRoleForUser(editingUser)) {
                payload.role = (editingUser as any)?.role;
            }

            if (nextManagerId !== prevManagerId && !isAmUser) {
                (payload as any).managerId = nextManagerId;
            }

            if (isAmUser && nextManagerId && nextManagerId !== prevManagerId) {
                const hRes = await authService.updateAmHierarchy(userId, nextManagerId);
                if (!(hRes as any)?.success) {
                    const msg = ((hRes as any)?.message || (hRes as any)?.msg || 'Failed to update hierarchy').toString();
                    toast.error(msg);
                    return;
                }
                const updated = (hRes as any)?.data || (hRes as any)?.user;
                if (!hasExternalUsers && updated) {
                    setInternalUsers((prev) => prev.map((u) => {
                        if (getUserIdValue(u) !== userId) return u;
                        return { ...(u as any), ...(updated as any) } as UserType;
                    }));
                }
            }

            if (onUpdateUser) {
                await onUpdateUser(userId, payload);
            } else {
                const res = await authService.updateUser(userId, payload);
                if (!(res as any)?.success) {
                    const msg = ((res as any)?.message || (res as any)?.msg || 'Failed to update user').toString();
                    toast.error(msg);
                    return;
                }
            }

            if (!hasExternalUsers) {
                setInternalUsers((prev) => prev.map((u) => {
                    if (getUserIdValue(u) !== userId) return u;
                    return { ...u, ...payload } as UserType;
                }));
            }

            toast.success('User updated successfully');
            setShowEditModal(false);
            setEditingUser(null);
        } catch (error: any) {
            const apiMsg = error?.response?.data?.message || error?.response?.data?.msg;
            const msg = (apiMsg || error?.message || 'Failed to update user').toString();
            toast.error(msg);
        } finally {
            setSavingUserId(null);
        }
    };

    const handleDeleteClick = (userId: string) => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to delete users');
            return;
        }

        const target = usersById.get(userId) || usersById.get(String(userId));
        if (target && !canManageTargetUser(target)) {
            toast.error('You do not have permission to delete this user');
            return;
        }

        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const handleCancelDelete = () => {
        if (deletingUserId) return;
        setShowDeleteModal(false);
        setUserToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to delete users');
            return;
        }

        const target = usersById.get(userToDelete) || usersById.get(String(userToDelete));
        if (target && !canManageTargetUser(target)) {
            toast.error('You do not have permission to delete this user');
            return;
        }

        setDeletingUserId(userToDelete);
        try {
            if (onDeleteUser) {
                await onDeleteUser(userToDelete);
            } else {
                const res = await authService.deleteUser(userToDelete);
                if (!(res as any)?.success) {
                    const msg = ((res as any)?.message || (res as any)?.msg || 'Failed to delete user').toString();
                    toast.error(msg);
                    return;
                }
            }

            if (!hasExternalUsers) {
                setInternalUsers((prev) => prev.filter((u) => getUserIdValue(u) !== userToDelete));
            }

            if (selectedUserId === userToDelete) {
                setSelectedUserId(null);
            }

            toast.success('User deleted successfully');
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error: any) {
            const apiMsg = error?.response?.data?.message || error?.response?.data?.msg;
            const msg = (apiMsg || error?.message || 'Failed to delete user').toString();
            toast.error(msg);
        } finally {
            setDeletingUserId(null);
        }
    };

    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const getUserAvatar = (user: UserType, size: 'sm' | 'md' | 'lg' = 'md'): React.ReactElement => {
        const initials = getUserInitials(user.name);
        const avatarUrl = userAvatarUrl(user);
        const role = normalizeRole(user.role);
        let gradient = 'from-gray-600 to-gray-800';

        switch (role) {
            case 'admin':
                gradient = 'from-purple-500 to-purple-700';
                break;
            case 'md_manager':
            case 'ob_manager':
            case 'manager':
            case 'troubleshoot_manager':
                gradient = `from-[${theme.primaryDark}] to-[${theme.primary}]`;
                break;
            case 'assistant':
            case 'sub_assistance':
                gradient = 'from-green-500 to-green-700';
                break;
            case 'sbm':
            case 'rm':
            case 'am':
                gradient = 'from-amber-500 to-amber-700';
                break;
            default:
                gradient = 'from-gray-600 to-gray-800';
        }

        const sizeClasses = {
            sm: 'h-8 w-8 text-xs',
            md: 'h-10 w-10 text-sm',
            lg: 'h-12 w-12 text-base'
        };

        const isOnline = user.isActive;

        if (avatarUrl) {
            const imgSizeClasses = {
                sm: 'h-8 w-8',
                md: 'h-10 w-10',
                lg: 'h-12 w-12'
            };
            return (
                <div className="flex-shrink-0 relative">
                    <img
                        src={avatarUrl}
                        alt={user?.name || 'User'}
                        className={`rounded-full object-cover border border-gray-200 ${imgSizeClasses[size]}`}
                        loading="lazy"
                    />
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                </div>
            );
        }

        return (
            <div className="flex-shrink-0 relative">
                <div className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold ${sizeClasses[size]}`}>
                    {initials}
                </div>
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} title={isOnline ? 'Online' : 'Offline'}></div>
            </div>
        );
    };

    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;
        return visibleUsers.find(u => u.id === selectedUserId) || null;
    }, [selectedUserId, visibleUsers]);

    const isInitialLoading = internalUsersLoading || internalTasksLoading || internalCurrentUserLoading;

    if (isInitialLoading) {
        return <TeamPageSkeleton />;
    }

    if (!canViewTeamPage) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="space-y-6">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg`}>
                                    <Shield className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Team Management</h1>
                                    <p className="mt-1 text-xs text-gray-500">This page is available to administrators and managers only</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="max-w-xl">
                            <div className="text-base font-semibold text-gray-900">Access denied</div>
                            <div className="mt-1 text-sm text-gray-600">
                                Your account does not have permission to view team members.
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                                If you believe this is a mistake, contact an administrator.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedUser) {
        return (
            <TeamDetailsPage
                user={selectedUser}
                tasks={tasks}
                users={users}
                onBack={() => setSelectedUserId(null)}
                onEditUser={handleEditClick}
                onDeleteUser={handleDeleteClick}
                onFetchTaskHistory={onFetchTaskHistory}
                isOverdue={isOverdue}
                currentUser={currentUser}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <div className={`p-2 bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg shadow-sm`}>
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Team Management</h1>
                            <p className="mt-0.5 text-xs text-gray-500">Manage your team members and their tasks</p>
                        </div>
                    </div>
                </div>
                <div className="mt-3 md:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {isCurrentUserAdmin && (
                            <select
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                            >
                                <option value="all">All Companies</option>
                                {companyOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        )}
                        {(canManageUsers || canManageUsersAsManager) && (
                            <button
                                onClick={handleAddClick}
                                className={`inline-flex items-center px-3 py-1.5 bg-[${theme.primary}] text-white text-xs font-medium rounded-lg hover:bg-[${theme.primaryDark}] transition-colors shadow-sm`}
                            >
                                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                Add User
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards - Compact */}
            {(() => {
                const baseUsers = companyScopedUsers;
                const selectedCompanyKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
                const speedCompanyKey = normalizeText('Speed Ecom');
                const isSpeedEcomSelected = Boolean(selectedCompanyKey)
                    && (selectedCompanyKey === speedCompanyKey
                        || (selectedCompanyKey.includes('speed') && selectedCompanyKey.includes('ecom')));

                const uniqueKeyForUser = (u: any) => String(u?.id || u?._id || u?.email || '').trim();
                const uniqueUsersMap = new Map<string, UserType>();
                for (const u of baseUsers || []) {
                    const key = uniqueKeyForUser(u);
                    if (!key) continue;
                    if (!uniqueUsersMap.has(key)) uniqueUsersMap.set(key, u);
                }
                const uniqueUsers = Array.from(uniqueUsersMap.values());

                const countByRole = (roleKey: string) => uniqueUsers.filter((u) => normalizeRole((u as any)?.role) === roleKey).length;

                const speedHierarchyRoles = new Set(['sbm', 'rm', 'am', 'sales_manager', 'sales_man']);
                const speedHierarchyUsers = uniqueUsers.filter((u) => speedHierarchyRoles.has(normalizeRole((u as any)?.role)));
                const speedHierarchyUserIds = new Set(speedHierarchyUsers.map((u) => uniqueKeyForUser(u)).filter(Boolean));
                const speedHierarchyCount = Array.from(speedHierarchyUserIds).length;

                const totalCount = isSpeedEcomSelected ? speedHierarchyCount : uniqueUsers.length;

                const roleOrder = ['md_manager', 'ob_manager', 'manager', 'marketer_manager', 'sbm', 'rm', 'am', 'sales_manager', 'sales_man', 'assistant', 'sub_assistance', 'troubleshoot_manager'];

                const roleLabels: Record<string, string> = {
                    md_manager: 'MD',
                    ob_manager: 'OB',
                    manager: 'Mgr',
                    troubleshoot_manager: 'TS',
                    marketer_manager: 'MK',
                    sbm: 'SBM',
                    rm: 'RM',
                    am: 'AM',
                    sales_manager: 'SM',
                    sales_man: 'Sales',
                    assistant: 'Asst',
                    sub_assistance: 'Sub'
                };

                const roleCardClass: Record<string, string> = {
                    md_manager: `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}]/30`,
                    ob_manager: `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}]/30`,
                    manager: `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}]/30`,
                    troubleshoot_manager: `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}]/30`,
                    marketer_manager: `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}]/30`,
                    sbm: 'bg-amber-50 border-amber-200',
                    rm: 'bg-amber-50 border-amber-200',
                    am: 'bg-amber-50 border-amber-200',
                    sales_manager: 'bg-indigo-50 border-indigo-200',
                    sales_man: 'bg-indigo-50 border-indigo-200',
                    assistant: 'bg-green-50 border-green-200',
                    sub_assistance: 'bg-green-50 border-green-200'
                };

                const roleTextClass: Record<string, string> = {
                    md_manager: `text-[${theme.primaryDark}]`,
                    ob_manager: `text-[${theme.primaryDark}]`,
                    manager: `text-[${theme.primaryDark}]`,
                    troubleshoot_manager: `text-[${theme.primaryDark}]`,
                    sbm: 'text-amber-700',
                    rm: 'text-amber-700',
                    am: 'text-amber-700',
                    sales_manager: 'text-indigo-700',
                    sales_man: 'text-indigo-700',
                    assistant: 'text-green-700',
                    sub_assistance: 'text-green-700'
                };

                const isRoleVisible = (roleKey: string) => {
                    if (isCurrentUserAdmin) return true;
                    if (roleKey === 'md_manager') return isCurrentUserMdManager;
                    if (roleKey === 'ob_manager') return isCurrentUserMdManager || isCurrentUserObManager || isCurrentUserManager;
                    if (roleKey === 'manager') return isCurrentUserMdManager || isCurrentUserObManager || isCurrentUserManager;
                    if (roleKey === 'marketer_manager') return isCurrentUserMdManager || isCurrentUserObManager || isCurrentUserManager;
                    if (roleKey === 'troubleshoot_manager') return isCurrentUserMdManager || isCurrentUserAdmin;
                    if (roleKey === 'sbm' || roleKey === 'rm' || roleKey === 'am') return isCurrentUserSbm || isCurrentUserRm || isCurrentUserAm;
                    if (roleKey === 'sales_manager' || roleKey === 'sales_man') return isSpeedEcomContext || isCurrentUserSbm || isCurrentUserSalesManager || isCurrentUserSalesMan;
                    if (roleKey === 'assistant' || roleKey === 'sub_assistance') return true;
                    return false;
                };

                const dynamicMdImpexRoles = (availableRoles || [])
                    .filter((r: RoleItem) => !roleOrder.includes(r.key))
                    .filter((r: RoleItem) => {
                        const speedEComKeywords = ['speed', 'ecom', 'speed_ecom', 'speedecom', 'speed-ecom'];
                        return !speedEComKeywords.some(keyword => r.key.toLowerCase().includes(keyword) || r.name.toLowerCase().includes(keyword));
                    })
                    .filter((r: RoleItem) => r.key !== 'admin');

                const extendedRoleOrder = [...roleOrder, ...dynamicMdImpexRoles.map((r: RoleItem) => r.key)];
                const extendedRoleLabels: Record<string, string> = {
                    ...roleLabels,
                    ...dynamicMdImpexRoles.reduce((acc: Record<string, string>, r: RoleItem) => {
                        acc[r.key] = r.name.substring(0, 4);
                        return acc;
                    }, {})
                };

                const dynamicCardClasses = dynamicMdImpexRoles.reduce((acc: Record<string, string>, r: RoleItem, idx: number) => {
                    const colors = ['bg-pink-50 border-pink-200', 'bg-teal-50 border-teal-200', 'bg-lime-50 border-lime-200', 'bg-rose-50 border-rose-200', 'bg-slate-50 border-slate-200', 'bg-fuchsia-50 border-fuchsia-200'];
                    acc[r.key] = colors[idx % colors.length];
                    return acc;
                }, {});

                const dynamicTextClasses = dynamicMdImpexRoles.reduce((acc: Record<string, string>, r: RoleItem, idx: number) => {
                    const colors = ['text-pink-700', 'text-teal-700', 'text-lime-700', 'text-rose-700', 'text-slate-700', 'text-fuchsia-700'];
                    acc[r.key] = colors[idx % colors.length];
                    return acc;
                }, {});

                const extendedRoleCardClass: Record<string, string> = {
                    ...roleCardClass,
                    ...dynamicCardClasses
                };

                const extendedRoleTextClass: Record<string, string> = {
                    ...roleTextClass,
                    ...dynamicTextClasses
                };

                const rolesToRender = extendedRoleOrder
                    .filter((r) => isRoleVisible(r) || dynamicMdImpexRoles.some((dr: RoleItem) => dr.key === r))
                    .filter((r) => countByRole(r) > 0 || dynamicMdImpexRoles.some((dr: RoleItem) => dr.key === r));

                const gridCols = rolesToRender.length + 1;
                const gridClass = gridCols <= 6
                    ? 'grid grid-cols-3 md:grid-cols-6 gap-2'
                    : 'grid grid-cols-3 md:grid-cols-6 xl:grid-cols-10 gap-2';

                return (
                    <div className={gridClass}>
                        <button
                            onClick={() => setFilterRole('all')}
                            className={`p-2 rounded-lg border text-left transition-all ${filterRole === 'all' ? `bg-[${theme.primaryUltralight}] border-[${theme.primaryLight}] shadow-sm` : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                        >
                            <div className="text-lg font-bold text-gray-900">{totalCount}</div>
                            <div className="text-[10px] text-gray-600 mt-0.5">Total</div>
                        </button>
                        {rolesToRender.map((roleKey) => (
                            <button
                                key={roleKey}
                                onClick={() => setFilterRole(roleKey)}
                                className={`p-2 rounded-lg border text-left transition-all ${filterRole === roleKey ? `${extendedRoleCardClass[roleKey] || 'bg-gray-50 border-gray-200'} shadow-sm` : `bg-white border-gray-200 hover:${extendedRoleCardClass[roleKey] || 'bg-gray-50'}`}`}
                            >
                                <div className={`text-lg font-bold ${extendedRoleTextClass[roleKey] || 'text-gray-700'}`}>{countByRole(roleKey)}</div>
                                <div className="text-[10px] text-gray-600 mt-0.5">{extendedRoleLabels[roleKey] || roleKey}</div>
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="search"
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                placeholder="Search users by name, email, or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60 self-start lg:self-auto">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md flex items-center justify-center transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-[${theme.primary}] font-medium scale-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 scale-95'}`}
                            title="Card View"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span className="ml-1 text-xs">Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md flex items-center justify-center transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-[${theme.primary}] font-medium scale-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 scale-95'}`}
                            title="List View"
                        >
                            <List className="h-3.5 w-3.5" />
                            <span className="ml-1 text-xs">List</span>
                        </button>
                    </div>
                </div>

                {/* Users List */}
                <div>
                    {filteredAndSortedUsers.length === 0 ? (
                        <div className="text-center py-6">
                            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <div className="text-sm font-semibold text-gray-900">No users found</div>
                            <div className="mt-0.5 text-xs text-gray-600">Try changing the filters or search term</div>
                        </div>
                    ) : ((() => {
                        const content = filteredAndSortedUsers.map((user) => {
                            const stats = getUserStats(user.id, user.email);
                            const targetId = (user?.id || (user as any)?._id || '').toString();
                            const isSelf = Boolean(currentUserIdValue && targetId && targetId === currentUserIdValue);
                            const chain = getReportingChain(user);
                            const topDownChain = chain.slice().reverse();
                            const shouldShowHierarchy = normalizeRole(user?.role) !== 'assistant';

                            return viewMode === 'list' ? (
                                <tr key={user.id} onClick={() => openUserDetails(user.id)} className="hover:bg-gray-50/50 cursor-pointer transition-colors group">
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            {getUserAvatar(user, 'sm')}
                                            <div>
                                                <div className="font-semibold text-sm text-gray-900">{user.name}</div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5"><Mail className="h-2.5 w-2.5" /> <span className="truncate max-w-[120px]">{user.email}</span></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg inline-flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleIcon(user.role)}
                                            {user.role || 'User'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        {shouldShowHierarchy ? (
                                            <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                                                {topDownChain.length > 0 ? (
                                                    topDownChain.map((u, idx) => (
                                                        <React.Fragment key={(u?.id || u?.email || idx) as any}>
                                                            {idx > 0 && <ChevronRight className="h-2.5 w-2.5 text-gray-300" />}
                                                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${getRoleBadgeColor(u?.role || '')}`}>
                                                                {getRoleIcon(u?.role || '')}
                                                                <span className="truncate max-w-[60px] font-bold text-gray-900">{u?.name || ''}</span>
                                                            </span>
                                                        </React.Fragment>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400 text-[10px] italic">Unassigned</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className="text-center bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50 min-w-[40px]">
                                                <div className="text-[8px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Total</div>
                                                <div className="font-bold text-gray-900 text-[10px]">{stats.totalAssigned}</div>
                                            </div>
                                            <div className="text-center bg-green-50/50 px-1.5 py-0.5 rounded border border-green-100/50 min-w-[40px]">
                                                <div className="text-[8px] text-green-600 font-bold uppercase tracking-wider mb-0.5">Done</div>
                                                <div className="font-bold text-gray-900 text-[10px]">{stats.completed}</div>
                                            </div>
                                            <div className="text-center bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100/50 min-w-[40px]">
                                                <div className="text-[8px] text-amber-600 font-bold uppercase tracking-wider mb-0.5">Pend</div>
                                                <div className="font-bold text-gray-900 text-[10px]">{stats.pending}</div>
                                            </div>
                                            <div className="text-center bg-red-50/50 px-1.5 py-0.5 rounded border border-red-100/50 min-w-[40px]">
                                                <div className="text-[8px] text-red-600 font-bold uppercase tracking-wider mb-0.5">Over</div>
                                                <div className="font-bold text-gray-900 text-[10px]">{stats.overdue}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {(() => {
                                            const canEditAsAm = isCurrentUserAm && isSpeedEcomUser(user);
                                            const canShowActions = canManageUsers || canManageUsersAsManager || canEditAsAm;
                                            if (!canShowActions || isSelf || !canManageTargetUser(user)) return <span className="text-gray-300 text-[10px]">-</span>;
                                            return (
                                                <div className="flex justify-end gap-1.5">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(user); }} className="px-2 py-1 text-[10px] font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-[${theme.primary}] transition-colors">Edit</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(user.id); }} className="px-2 py-1 text-[10px] font-medium bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors">Delete</button>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ) : (
                                <div
                                    key={user.id}
                                    onClick={() => openUserDetails(user.id)}
                                    className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-[${theme.primaryLight}] hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            {getUserAvatar(user, 'md')}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="font-bold text-sm text-gray-900 truncate">{user.name}</h3>
                                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
                                                        {getRoleIcon(user.role)}
                                                        {user.role || 'User'}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-[11px] text-gray-600 flex items-center gap-1.5 min-w-0">
                                                    <Mail className="h-3 w-3 text-gray-400" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                                {(user.department || user.position) && (
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        {user.department && (
                                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                {user.department}
                                                            </span>
                                                        )}
                                                        {user.position && (
                                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                {user.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {shouldShowHierarchy && (
                                                    <div className="mt-1.5">
                                                        <div className="text-[10px] font-semibold text-gray-700">Hierarchy</div>
                                                        {topDownChain.length > 0 ? (
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                                                {topDownChain.map((u, idx) => (
                                                                    <React.Fragment key={(u?.id || u?.email || idx) as any}>
                                                                        {idx > 0 && <ChevronRight className="h-2.5 w-2.5 text-gray-300" />}
                                                                        <span className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[9px] font-semibold ${getRoleBadgeColor(u?.role || '')}`}>
                                                                            {getRoleIcon(u?.role || '')}
                                                                            <span className="whitespace-nowrap">
                                                                                {getRoleLabel(u?.role)}
                                                                            </span>
                                                                            <span className="text-gray-700 font-medium">:</span>
                                                                            <span className="whitespace-nowrap font-bold text-gray-900">
                                                                                {u?.name || ''}
                                                                            </span>
                                                                        </span>
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-0.5 text-[10px] text-gray-500">Unassigned</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-medium text-gray-600">Tasks</div>
                                            <div className="text-base font-bold text-gray-900">{stats.totalAssigned}</div>
                                        </div>
                                    </div>

                                    {/* Task Stats Grid - Compact */}
                                    <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                                        <div className="text-center p-1.5 bg-blue-50 rounded">
                                            <div className="text-[9px] font-semibold text-blue-700 uppercase">Total</div>
                                            <div className="text-sm font-bold text-gray-900">{stats.totalAssigned}</div>
                                        </div>
                                        <div className="text-center p-1.5 bg-green-50 rounded">
                                            <div className="text-[9px] font-semibold text-green-700 uppercase">Done</div>
                                            <div className="text-sm font-bold text-gray-900">{stats.completed}</div>
                                        </div>
                                        <div className="text-center p-1.5 bg-amber-50 rounded">
                                            <div className="text-[9px] font-semibold text-amber-700 uppercase">Pend</div>
                                            <div className="text-sm font-bold text-gray-900">{stats.pending}</div>
                                        </div>
                                        <div className="text-center p-1.5 bg-red-50 rounded">
                                            <div className="text-[9px] font-semibold text-red-700 uppercase">Over</div>
                                            <div className="text-sm font-bold text-gray-900">{stats.overdue}</div>
                                        </div>
                                    </div>

                                    {(() => {
                                        const canEditAsAm = isCurrentUserAm && isSpeedEcomUser(user);
                                        const canShowActions = canManageUsers || canManageUsersAsManager || canEditAsAm;
                                        if (!canShowActions || isSelf) return null;
                                        if (!canManageTargetUser(user)) return null;
                                        return (
                                            <div className="flex justify-end gap-2 mt-2.5 pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(user); }}
                                                    className="px-2.5 py-1 text-[10px] font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(user.id); }}
                                                    className="px-2.5 py-1 text-[10px] font-medium bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        });

                        return viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {content}
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                                <table className="w-full text-left text-xs">
                                    <thead className={`bg-[${theme.primaryUltralight}] border-b border-gray-200 text-gray-600`}>
                                        <tr>
                                            <th className="px-4 py-2 font-semibold text-gray-700">User</th>
                                            <th className="px-4 py-2 font-semibold text-gray-700">Role</th>
                                            <th className="px-4 py-2 font-semibold text-gray-700">Hierarchy</th>
                                            <th className="px-4 py-2 font-semibold text-gray-700 text-center">Tasks</th>
                                            <th className="px-4 py-2 font-semibold text-gray-700 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200/60">
                                        {content}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()
                    )}
                </div>
            </div>

            {/* Modals remain the same with their existing sizes */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelDelete} />
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900">Delete User</h3>
                            <button onClick={handleCancelDelete} className="text-gray-400 hover:text-gray-600" disabled={!!deletingUserId}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm text-gray-600">
                                Are you sure you want to delete this user?
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleCancelDelete}
                                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
                                    disabled={!!deletingUserId}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-3 py-1.5 text-xs font-medium bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 text-white"
                                    disabled={!!deletingUserId}
                                >
                                    {deletingUserId ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelEdit} />
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900">Edit User</h3>
                            <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600" disabled={!!savingUserId}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={editingUser?.name || ''}
                                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, name: e.target.value } : null)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={editingUser?.email || ''}
                                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, email: e.target.value } : null)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={editingUser?.role || 'user'}
                                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, role: e.target.value } : null)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                    disabled={!!savingUserId || !canEditRoleForUser(editingUser)}
                                >
                                    {(roleOptionsForEditModal || []).map((r) => (
                                        <option key={r.key} value={r.key}>
                                            {r.name || r.key}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {needsManagerDropdown((editingUser as any)?.role) && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        {getManagerLabelForRole((editingUser as any)?.role)}
                                    </label>
                                    <select
                                        value={((editingUser as any)?.managerId || '').toString()}
                                        onChange={(e) => setEditingUser(editingUser ? { ...editingUser, managerId: e.target.value } as any : null)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                        disabled={!!savingUserId}
                                    >
                                        <option value="">Select {getManagerLabelForRole((editingUser as any)?.role)}</option>
                                        {((normalizeRole((editingUser as any)?.role) === 'am' ? rmCandidatesForEditing : managerCandidatesForEditing) || []).map((m) => {
                                            const id = (m?.id || (m as any)?._id || '').toString();
                                            if (!id) return null;
                                            return (
                                                <option key={id} value={id}>
                                                    {(m?.name || m?.email || 'Manager').toString()}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={editingUser?.department || ''}
                                        onChange={(e) => setEditingUser(editingUser ? { ...editingUser, department: e.target.value } : null)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                        placeholder="Department"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                                    <input
                                        type="text"
                                        value={editingUser?.position || ''}
                                        onChange={(e) => setEditingUser(editingUser ? { ...editingUser, position: e.target.value } : null)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                        placeholder="Position"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                disabled={!!savingUserId}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!!savingUserId}
                                className={`px-3 py-1.5 text-xs font-medium bg-[${theme.primary}] rounded hover:bg-[${theme.primaryDark}] transition-colors disabled:opacity-50 inline-flex items-center text-white`}
                            >
                                <Save className="h-3 w-3 mr-1.5" />
                                {savingUserId ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelAdd} />
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900">{isCurrentUserManager ? 'Add Assistant' : 'Add Member'}</h3>
                            <button onClick={handleCancelAdd} className="text-gray-400 hover:text-gray-600" disabled={addingUser}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent pr-7"
                                        placeholder="At least 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </button>
                                </div>
                            </div>

                            {!isCurrentUserManager && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Team</label>
                                        <select
                                            value={(newUser.companyName || '').toString()}
                                            onChange={(e) => setNewUser({ ...newUser, companyName: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                            disabled={companiesLoading || isTeamCompanyForced}
                                        >
                                            <option value="">Select team</option>
                                            {companyOptions.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => {
                                                const nextRole = e.target.value;
                                                setNewUser({ ...newUser, role: nextRole, managerId: undefined });
                                                setAddAdminId(!isCurrentUserSuperAdmin && currentUserRole === 'admin' ? getUserIdValue(currentUser) : '');
                                                setAddSbmId('');
                                                setAddRmId('');
                                            }}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                            disabled={isCurrentUserAdmin ? rolesLoading : false}
                                        >
                                            {roleOptionsForAddModal.map((r) => (
                                                <option key={r.key} value={r.key}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedAddRoleKey === 'sbm' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Admin</label>
                                            <select
                                                value={addAdminId}
                                                onChange={(e) => {
                                                    const next = e.target.value;
                                                    setAddAdminId(next);
                                                    setNewUser({ ...newUser, managerId: next || undefined });
                                                }}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                            >
                                                <option value="">Select admin</option>
                                                {adminCandidates.map((u) => (
                                                    <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                        {u.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {selectedAddRoleKey === 'rm' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Admin</label>
                                                <select
                                                    value={addAdminId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddAdminId(next);
                                                        setAddSbmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select admin</option>
                                                    {adminCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">SBM</label>
                                                <select
                                                    value={addSbmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddSbmId(next);
                                                        setNewUser({ ...newUser, managerId: next || undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select SBM</option>
                                                    {sbmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {selectedAddRoleKey === 'sales_manager' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Admin</label>
                                                <select
                                                    value={addAdminId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddAdminId(next);
                                                        setAddSbmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select admin</option>
                                                    {adminCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">SBM</label>
                                                <select
                                                    value={addSbmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddSbmId(next);
                                                        setNewUser({ ...newUser, managerId: next || undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select SBM</option>
                                                    {sbmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {selectedAddRoleKey === 'sales_man' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Admin</label>
                                                <select
                                                    value={addAdminId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddAdminId(next);
                                                        setAddSbmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select admin</option>
                                                    {adminCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">SBM</label>
                                                <select
                                                    value={addSbmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddSbmId(next);
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select SBM</option>
                                                    {sbmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Sales Manager</label>
                                                <select
                                                    value={(newUser as any).salesManagerId || ''}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setNewUser({ ...newUser, managerId: next || undefined, salesManagerId: next } as any);
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select Sales Manager</option>
                                                    {salesManagerCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {selectedAddRoleKey === 'am' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Admin</label>
                                                <select
                                                    value={addAdminId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddAdminId(next);
                                                        setAddSbmId('');
                                                        setAddRmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select admin</option>
                                                    {adminCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">SBM</label>
                                                <select
                                                    value={addSbmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddSbmId(next);
                                                        setAddRmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select SBM</option>
                                                    {sbmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">RM</label>
                                                <select
                                                    value={addRmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddRmId(next);
                                                        setNewUser({ ...newUser, managerId: next || undefined });
                                                    }}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent"
                                                >
                                                    <option value="">Select RM</option>
                                                    {rmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={handleCancelAdd}
                                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
                                disabled={addingUser}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNewUser}
                                className={`px-3 py-1.5 text-xs font-medium bg-[${theme.primary}] rounded hover:bg-[${theme.primaryDark}] disabled:opacity-50 text-white`}
                                disabled={addingUser}
                            >
                                {addingUser ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamPage;