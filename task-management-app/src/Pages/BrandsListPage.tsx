import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building,
    ArrowRight,
    Search,
    Star,
    Grid,
    List,
    Users,
    Calendar,
    Activity,
    Eye,
    Package,
    X,
    Filter,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Edit,
    Trash2,
    MoreVertical,
    CalendarDays,
    CheckCircle,
    AlertCircle,
    Clock,
    AlertTriangle,
    History,
    Upload,
    ChevronLeft,
    ChevronRight,
    Layers,
    Sparkles,
    ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Brand, BrandHistory, BrandStatus, Task, UserType } from '../Types/Types';
import { brandService } from '../Services/Brand.service';
import { taskService } from '../Services/Task.services';
import { authService } from '../Services/User.Services';
import { companyService } from '../Services/Company.service';
import CreateBrandModal from './CreateBrandModal';
import EditBrandModal from './EditBrandModal';
import EditCompanyModal from './EditCompanyModal';
import BulkBrandAddModal from './BulkBrandAddModal';
import mdImpexAccessService from '../Services/MdImpexAccess.services';

import { routepath } from '../Routes/route';

interface BrandsListPageProps {
    isSidebarCollapsed?: boolean;
    onSelectBrand?: (brandId: string) => void;
    currentUser?: UserType;
    tasks?: Task[];
}

interface FilterState {
    status: BrandStatus | 'all';
    company: string;
    category: string;
    search: string;
    brand: string;
}

interface BrandStats {
    totalBrands: number;
    activeBrands: number;
    totalTasks: number;
    averageTasksPerBrand: number;
}

type TaskDisplayType = 'all' | 'total-brands' | 'active-brands' | 'total-tasks' | null;

const DEFAULT_BRANDS_PER_PAGE = 12;
const PAGE_SIZE_OPTIONS = [12, 24, 36, 48];

// Color theme variables
const colors = {
    primary: {
        dark: '#0f2a6e',
        main: '#1e3a8a',
        light: '#3b82f6',
        lighter: '#60a5fa',
        ultralight: '#dbeafe'
    }
};

const BrandsListPage: React.FC<BrandsListPageProps> = ({
    onSelectBrand,
    currentUser,
    tasks: propTasks = [],
}) => {
    const navigate = useNavigate();
    const accessDeniedRef = useRef(false);

    const normalizeRoleKey = useCallback((value: unknown): string => {
        return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    }, []);

    const role = (currentUser?.role || '').toLowerCase();
    const roleKey = normalizeRoleKey(currentUser?.role);

    const hasAccess = useCallback((moduleId: string) => {
        const perms = (currentUser as any)?.permissions;
        if (!perms || typeof perms !== 'object') return true;
        if (Object.keys(perms).length === 0) return true;

        if (typeof (perms as any)[moduleId] === 'undefined') return true;
        const perm = String((perms as any)[moduleId] || '').trim().toLowerCase();
        if (['deny', 'no', 'false', '0', 'disabled'].includes(perm)) return false;
        if (['allow', 'allowed', 'yes', 'true', '1'].includes(perm)) return true;
        return perm !== 'deny';
    }, [currentUser]);

    const canViewBrands = useMemo(() => hasAccess('brands_page'), [hasAccess]);
    const canEditBrand = useMemo(() => hasAccess('brand_edit'), [hasAccess]);
    const canDeleteBrand = useMemo(() => hasAccess('brand_delete'), [hasAccess]);
    const canBulkAddCompanies = useMemo(() => hasAccess('company_bulk_add'), [hasAccess]);
    const canBulkAddBrands = useMemo(() => {
        const r = String((currentUser as any)?.role || '').trim().toLowerCase();
        return r === 'super_admin' || r === 'admin' || r === 'md_manager' || r === 'manager' || r === 'marketer_manager' || hasAccess('brand_bulk_add');
    }, [currentUser, hasAccess]);
    const canEditCompany = useMemo(() => {
        const r = String((currentUser as any)?.role || '').trim().toLowerCase();
        const roleAllows = r === 'super_admin' || r === 'admin' || r === 'md_manager' || r === 'ob_manager';
        return roleAllows && hasAccess('company_edit');
    }, [currentUser, hasAccess]);
    const canDeleteCompany = useMemo(() => {
        const r = String((currentUser as any)?.role || '').trim().toLowerCase();
        const roleAllows = r === 'super_admin' || r === 'admin' || r === 'md_manager' || r === 'ob_manager';
        return roleAllows && hasAccess('company_delete');
    }, [currentUser, hasAccess]);
    const canViewBrandsCompaniesReport = useMemo(() => hasAccess('brands_companies_report'), [hasAccess]);

    const canViewBrandHistory = useMemo(() => {
        if (canViewBrandsCompaniesReport) return true;
        return role === 'sbm';
    }, [canViewBrandsCompaniesReport, role]);

    useEffect(() => {
        if (!currentUser) return;
        const name = String((currentUser as any)?.name || '').trim().toLowerCase();
        const email = String((currentUser as any)?.email || '').trim().toLowerCase();
        const id = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
        if (!id || !email || name === 'loading...') return;
        if (!canViewBrands) {
            if (accessDeniedRef.current) return;
            accessDeniedRef.current = true;
            toast.error('Access denied');
            navigate(routepath.dashboard);
        }
    }, [canViewBrands, currentUser, navigate]);

    const [apiBrands, setApiBrands] = useState<Brand[]>([]);
    const [deletedBrands, setDeletedBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [taskDisplayType, setTaskDisplayType] = useState<TaskDisplayType>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [companyDocs, setCompanyDocs] = useState<any[]>([]);
    const [deletedCompanyDocs, setDeletedCompanyDocs] = useState<any[]>([]);
    const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
    const [showDeletedBrands, setShowDeletedBrands] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [brandsPerPage, setBrandsPerPage] = useState<number>(DEFAULT_BRANDS_PER_PAGE);
    const [brandsTotal, setBrandsTotal] = useState<number>(0);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [personAccess, setPersonAccess] = useState<any | null>(null);

    const [brandHistoryPage, setBrandHistoryPage] = useState(1);
    const [brandHistoryLimit] = useState(30);
    const [brandHistoryTotal, setBrandHistoryTotal] = useState(0);
    const [brandHistoryItems, setBrandHistoryItems] = useState<any[]>([]);

    const effectiveTasks = useMemo(() => {
        const safePropTasks = Array.isArray(propTasks) ? propTasks : [];
        if (safePropTasks.length > 0) return safePropTasks;
        return Array.isArray(allTasks) ? allTasks : [];
    }, [propTasks, allTasks]);

    const reportTasks = useMemo(() => {
        const tasks = Array.isArray(effectiveTasks) ? effectiveTasks : [];

        const normalize = (v: any) => String(v || '').trim().toLowerCase();

        const getEmail = (value: any) => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'object') return value?.email || '';
            return '';
        };

        const getId = (value: any) => {
            if (!value) return '';
            if (typeof value === 'string') return '';
            if (typeof value === 'object') return value?.id || value?._id || '';
            return '';
        };

        const currentEmail = normalize((currentUser as any)?.email);
        const currentId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();

        const isAssignedToCurrentUser = (t: any) => {
            if (!currentEmail && !currentId) return false;

            const assignedToRaw = t?.assignedToUser || t?.assignedTo;
            const email = normalize(getEmail(assignedToRaw));
            const id = String(getId(assignedToRaw) || '').trim();

            if (currentEmail && email && email === currentEmail) return true;
            if (currentId && id && id === currentId) return true;
            if (currentEmail && typeof t?.assignedTo === 'string' && normalize(t.assignedTo) === currentEmail) return true;
            if (currentId && typeof t?.assignedTo === 'string' && String(t.assignedTo).trim() === currentId) return true;
            return false;
        };

        if (role === 'assistant') {
            return tasks.filter(isAssignedToCurrentUser);
        }

        if (role === 'manager' || role === 'marketer_manager') {
            return tasks.filter((t: any) => {
                if (isAssignedToCurrentUser(t)) return true;

                const assignedByRaw = t?.assignedBy;
                const byEmail = normalize(getEmail(assignedByRaw));
                const byId = String(getId(assignedByRaw) || '').trim();

                if (currentEmail && byEmail && byEmail === currentEmail) return true;
                if (currentId && byId && byId === currentId) return true;
                return false;
            });
        }

        return tasks;
    }, [effectiveTasks, currentUser, role]);

    const [stats, setStats] = useState<BrandStats>({
        totalBrands: 0,
        activeBrands: 0,
        totalTasks: 0,
        averageTasksPerBrand: 0,
    });

    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        company: (roleKey === 'md_manager' || roleKey === 'marketer_manager' || roleKey === 'assistant' || roleKey === 'assistance') ? 'md impex' : 'all',
        category: 'all',
        search: '',
        brand: 'all',
    });

    const brands = useMemo(() => {
        const normalize = (v: any) => String(v || '').trim().toLowerCase();
        const myEmail = normalize((currentUser as any)?.email);

        const allowedBrandNames = new Set<string>();
        if (personAccess?.allowedBrands && Array.isArray(personAccess.allowedBrands)) {
            personAccess.allowedBrands.forEach((b: string) => {
                if (b) allowedBrandNames.add(normalize(b));
            });
        }

        if (role === 'assistant' || role === 'assistance' || roleKey === 'assistant' || roleKey === 'assistance') {
            const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
            const myEmail = normalize((currentUser as any)?.email);

            return apiBrands.filter(b => {
                const status = (b?.status || '').toString().toLowerCase();
                if (status === 'deleted' || status === 'archived') return false;
                
                // Strictly brands created by the user
                const creator = String(b?.createdBy || '').trim();
                const owner = (b as any)?.owner;
                const ownerId = (owner && typeof owner === 'object') ? (owner.id || owner._id) : owner;
                const creatorId = String(ownerId || creator || '').trim();

                if (creatorId && (creatorId === myId || creatorId === myEmail)) return true;
                
                // Fallback: check if the name matches the user's email prefix if creator is missing (some old data might have this)
                return false;
            });
        }

        if (role === 'manager' || role === 'marketer_manager') {
            const normalize = (v: any) => String(v || '').trim().toLowerCase();
            const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();

            const taskBrandIds = new Set<string>();
            const taskBrandCompanyKeys = new Set<string>();
            (Array.isArray(reportTasks) ? reportTasks : []).forEach((t: any) => {
                const id = String(t?.brandId || t?.brand?._id || t?.brand?.id || '').trim();
                if (id) taskBrandIds.add(id);

                const brandName = String(
                    typeof t?.brand === 'string'
                        ? t.brand
                        : (t?.brand?.name || t?.brandName || '')
                ).trim();
                const companyName = String(t?.companyName || t?.company || t?.company?.name || '').trim();

                if (brandName || companyName) {
                    taskBrandCompanyKeys.add(`${normalize(brandName)}|${normalize(companyName)}`);
                }
            });

            return [...apiBrands].filter((brand: any) => {
                if (brand?.status === 'deleted' || brand?.status === 'archived') return false;

                const brandId = String(brand?.id || brand?._id || '').trim();
                if (brandId && taskBrandIds.has(brandId)) return true;

                const brandKey = `${normalize(brand?.name)}|${normalize(brand?.company)}`;
                if (taskBrandCompanyKeys.has(brandKey)) return true;

                // From MD Impex Access config
                if (allowedBrandNames.has(normalize(brand?.name))) return true;

                const creator = String(brand?.createdBy || '').trim();
                const owner = (brand as any)?.owner;
                const ownerId = (owner && typeof owner === 'object') ? (owner.id || owner._id) : owner;
                if (myId && ownerId && String(ownerId) === myId) return true;
                if (creator === myId || creator === myEmail) return true;

                return false;
            });
        }

        return [...apiBrands].filter(brand =>
            brand.status !== 'deleted' && brand.status !== 'archived'
        );
    }, [apiBrands, currentUser, role, reportTasks, personAccess]);

    const accessibleBrands = brands;

    type BrandsPageHistoryItem = BrandHistory & {
        _brandId: string;
        _brandName: string;
        _brandGroupNumber?: string;
        _brandCompany: string;
        _rawTimestamp?: any;
    };

    const recentBrandActivity = useMemo(() => {
        const items: BrandsPageHistoryItem[] = [];

        const normalize = (v: any) => String(v || '').trim().toLowerCase();

        const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
        const myEmail = normalize((currentUser as any)?.email);

        const assignedBrandKeys = new Set<string>();
        (brands || []).forEach((b: any) => {
            const id = String(b?.id || b?._id || '').trim();
            if (id) assignedBrandKeys.add(id);
            assignedBrandKeys.add(`${normalize(b?.name)}|${normalize(b?.company)}`);
        });

        let sources: any[] = [...(brands || []), ...(deletedBrands || [])];

        const seen = new Set<string>();

        sources.forEach((b: any) => {
            const history = Array.isArray(b?.history) ? b.history : [];
            const brandId = String(b?.id || b?._id || '').trim();
            const brandName = String(b?.name || '').trim();
            const brandGroupNumber = String((b as any)?.groupNumber || '').trim();
            const brandCompany = String(b?.company || '').trim();

            const dedupeKey = `${brandId}|${brandName.toLowerCase()}|${brandCompany.toLowerCase()}|${String(b?.status || '')}`;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);

            history.forEach((h: any) => {
                items.push({
                    ...(h || {}),
                    _brandId: brandId,
                    _brandName: brandName,
                    _brandGroupNumber: brandGroupNumber,
                    _brandCompany: brandCompany,
                    _rawTimestamp: h?.timestamp || h?.performedAt
                });
            });
        });

        const toTime = (x: any) => {
            const raw = x?.timestamp || x?.performedAt || x?._rawTimestamp;
            const d = raw ? new Date(raw) : null;
            const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
            return t;
        };

        const roleByEmail = new Map<string, string>();
        const roleById = new Map<string, string>();
        (Array.isArray(allUsers) ? allUsers : []).forEach((u: any) => {
            const email = String(u?.email || '').trim().toLowerCase();
            const id = String(u?.id || u?._id || '');
            const r = String(u?.role || '').trim().toLowerCase();
            if (email) roleByEmail.set(email, r);
            if (id) roleById.set(id, r);
        });

        const isTaskHistory = (h: any) => {
            if (!h) return false;
            if (h?.isTaskHistory) return true;
            if (h?.taskTitle) return true;
            const action = String(h?.action || '').toLowerCase();
            if (action.includes('task')) return true;
            return Boolean(h?.metadata && (h.metadata.taskId || h.metadata.assignedTo || h.metadata.assignedBy));
        };

        const currentEmail = myEmail;
        const currentId = myId;

        const shouldIncludeHistory = (h: any) => {
            String(h?.action || '').toLowerCase();

            if (!isTaskHistory(h)) return true;

            if (role === 'assistant') {
                const meta = (h as any)?.metadata || {};
                const assignedToEmail = normalize(meta?.assignedToEmail || meta?.assignedTo || meta?.assistantEmail || meta?.assigneeEmail || meta?.assignedToUser?.email);
                const assignedToId = String(meta?.assignedToId || meta?.assigneeId || meta?.assignedToUser?.id || meta?.assignedToUser?._id || '').trim();

                if (currentEmail && assignedToEmail && assignedToEmail === currentEmail) return true;
                if (currentId && assignedToId && assignedToId === currentId) return true;
                return false;
            }

            if (role === 'manager' || role === 'marketer_manager') {
                const meta = (h as any)?.metadata || {};
                const assignedToEmail = normalize(meta?.assignedToEmail || meta?.assignedTo || meta?.assistantEmail || meta?.assigneeEmail || meta?.assignedToUser?.email);
                const assignedToId = String(meta?.assignedToId || meta?.assigneeId || meta?.assignedToUser?.id || meta?.assignedToUser?._id || '').trim();
                const assignedByEmail = normalize(meta?.assignedByEmail || meta?.assignedBy || meta?.assignerEmail || meta?.assignedByUser?.email);
                const assignedById = String(meta?.assignedById || meta?.assignerId || meta?.assignedByUser?.id || meta?.assignedByUser?._id || '').trim();

                if (currentEmail && assignedToEmail && assignedToEmail === currentEmail) return true;
                if (currentId && assignedToId && assignedToId === currentId) return true;
                if (currentEmail && assignedByEmail && assignedByEmail === currentEmail) return true;
                if (currentId && assignedById && assignedById === currentId) return true;
                return false;
            }

            return true;
        };

        const filtered = items.filter(shouldIncludeHistory);
        filtered.sort((a, b) => toTime(b) - toTime(a));
        return filtered.slice(0, 30);
    }, [brands, apiBrands, deletedBrands, reportTasks, currentUser, role, allUsers]);

    void recentBrandActivity;

    type CompaniesPageHistoryItem = any & {
        _companyId: string;
        _companyName: string;
        _rawTimestamp?: any;
    };

    const recentCompanyActivity = useMemo(() => {
        const items: CompaniesPageHistoryItem[] = [];

        const normalize = (v: any) => String(v || '').trim().toLowerCase();
        const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
        const myEmail = normalize((currentUser as any)?.email);

        const assignedCompanyNames = new Set<string>();
        if (role === 'assistant') {
            (brands || []).forEach((b: any) => {
                const name = normalize(b?.company);
                if (name) assignedCompanyNames.add(name);
            });
        }
        if (role === 'manager' || role === 'marketer_manager') {
            (reportTasks || []).forEach((t: any) => {
                const name = normalize(t?.companyName || t?.company);
                if (name) assignedCompanyNames.add(name);
            });
        }

        let sources: any[] = [...(companyDocs || []), ...(deletedCompanyDocs || [])];
        if (role === 'assistant' || role === 'manager' || role === 'marketer_manager') {
            sources = sources.filter((c: any) => assignedCompanyNames.has(normalize(c?.name)));
        }

        const seen = new Set<string>();

        sources.forEach((c: any) => {
            const history = Array.isArray(c?.history) ? c.history : [];
            const companyId = String(c?.id || c?._id || '').trim();
            const companyName = String(c?.name || '').trim();

            const dedupeKey = `${companyId}|${companyName.toLowerCase()}|${String(c?.isDeleted || '')}`;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);

            history.forEach((h: any) => {
                items.push({
                    ...(h || {}),
                    _companyId: companyId,
                    _companyName: companyName,
                    _rawTimestamp: h?.timestamp || h?.performedAt,
                });
            });
        });

        const toTime = (x: any) => {
            const raw = x?.timestamp || x?.performedAt || x?._rawTimestamp;
            const d = raw ? new Date(raw) : null;
            const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
            return t;
        };

        const shouldIncludeHistory = (h: any) => {
            const action = String(h?.action || '').toLowerCase();
            const isTaskHistory = action.includes('task');

            if (!isTaskHistory) return true;

            if (role === 'assistant') {
                const meta = (h as any)?.metadata || {};
                const assignedToEmail = normalize(meta?.assignedToEmail || meta?.assignedTo);
                const assignedToId = String(meta?.assignedToId || meta?.assigneeId || '');

                if (myEmail && assignedToEmail && assignedToEmail === myEmail) return true;
                if (myId && assignedToId && assignedToId === myId) return true;
                return false;
            }

            if (role === 'manager' || role === 'marketer_manager') {
                const meta = (h as any)?.metadata || {};
                const assignedToEmail = normalize(meta?.assignedToEmail || meta?.assignedTo);
                const assignedToId = String(meta?.assignedToId || meta?.assigneeId || '');
                const assignedByEmail = normalize(meta?.assignedByEmail || meta?.assignedBy);
                const assignedById = String(meta?.assignedById || meta?.assignerId || '');

                if (myEmail && assignedToEmail && assignedToEmail === myEmail) return true;
                if (myId && assignedToId && assignedToId === myId) return true;
                if (myEmail && assignedByEmail && assignedByEmail === myEmail) return true;
                if (myId && assignedById && assignedById === myId) return true;
                return false;
            }

            return true;
        };

        const filtered = items.filter(shouldIncludeHistory);
        filtered.sort((a, b) => toTime(b) - toTime(a));
        return filtered.slice(0, 30);
    }, [companyDocs, deletedCompanyDocs, brands, reportTasks, currentUser, role]);

    const adminDeletedBrands = useMemo(() => {
        if (!canDeleteBrand) return [];
        const safeDeletedBrands = Array.isArray(deletedBrands) ? deletedBrands : [];
        return safeDeletedBrands;
    }, [canDeleteBrand, deletedBrands]);

    const getActiveFilterCount = useCallback(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.company !== 'all') count++;
        if (filters.category !== 'all') count++;
        if (filters.brand !== 'all') count++;
        if (filters.search) count++;
        return count;
    }, [filters]);

    const companies = useMemo(() => {
        const fromBrands = (accessibleBrands || []).map(brand => (brand.company || '').toString().trim()).filter(Boolean);
        const fromCompaniesApi = (companyDocs || []).map((c: any) => (c?.name || '').toString().trim()).filter(Boolean);
        const list = [...new Set([...fromBrands, ...fromCompaniesApi])].sort((a, b) => a.localeCompare(b));

        if (roleKey === 'md_manager' || roleKey === 'marketer_manager' || roleKey === 'assistant' || roleKey === 'assistance' || role === 'assistant' || role === 'assistance') {
            const rawKey = 'mdimpex';
            const match = list.find((c) => String(c || '').trim().replace(/\s+/g, '').toLowerCase() === rawKey);
            if (match) return [match];
            return ['MD Impex'];
        }

        if (role !== 'sbm') return list;

        const raw = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();
        const rawKey = raw.replace(/\s+/g, '').toLowerCase();
        const match = list.find((c) => String(c || '').trim().replace(/\s+/g, '').toLowerCase() === rawKey);
        if (match) return [match];
        if (raw) return [raw];
        return list.slice(0, 1);
    }, [accessibleBrands, companyDocs, currentUser, role, roleKey]);

    const companiesForReport = useMemo(() => {
        const normalize = (v: any) => String(v || '').trim().toLowerCase();
        String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();

        const assignedCompanyNames = new Set<string>();
        if (role === 'assistant') {
            (brands || []).forEach((b: any) => {
                const name = normalize(b?.company);
                if (name) assignedCompanyNames.add(name);
            });
        }
        if (role === 'manager' || role === 'marketer_manager') {
            (reportTasks || []).forEach((t: any) => {
                const name = normalize(t?.companyName || t?.company);
                if (name) assignedCompanyNames.add(name);
            });
        }

        let list = Array.isArray(companyDocs) ? [...companyDocs] : [];
        if (role === 'assistant' || role === 'manager' || role === 'marketer_manager') {
            list = list.filter((c: any) => assignedCompanyNames.has(normalize(c?.name)));
        }
        return list.sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
    }, [companyDocs, brands, reportTasks, currentUser, role]);

    const userRoleById = useMemo(() => {
        const map = new Map<string, string>();
        (allUsers || []).forEach((u: any) => {
            const id = String(u?.id || u?._id || '');
            if (!id) return;
            map.set(id, String(u?.role || '').toLowerCase());
        });
        return map;
    }, [allUsers]);

    const userDisplayById = useMemo(() => {
        const map = new Map<string, string>();
        (allUsers || []).forEach((u: any) => {
            const id = String(u?.id || u?._id || '');
            if (!id) return;
            const label = (u?.name || u?.email || id).toString();
            map.set(id, label);
        });
        return map;
    }, [allUsers]);

    const _userRoleByEmail = useMemo(() => {
        const map = new Map<string, string>();
        (allUsers || []).forEach((u: any) => {
            const email = String(u?.email || '').trim().toLowerCase();
            if (!email) return;
            map.set(email, String(u?.role || '').toLowerCase());
        });
        return map;
    }, [allUsers]);

    const _userDisplayByEmail = useMemo(() => {
        const map = new Map<string, string>();
        (allUsers || []).forEach((u: any) => {
            const email = String(u?.email || '').trim().toLowerCase();
            if (email) map.set(email, String(u?.name || u?.displayName || '').trim());
        });
        return map;
    }, [allUsers]);

    void _userRoleByEmail;
    void _userDisplayByEmail;

    const fetchPersonAccess = useCallback(async () => {
        if (!currentUser?.email) return;
        try {
            const res = await mdImpexAccessService.getAllPersonAccess();
            if (res.success && Array.isArray(res.data)) {
                const myEmail = String(currentUser.email).trim().toLowerCase();
                const myAccess = res.data.find((a: any) => String(a.assignedToEmail).trim().toLowerCase() === myEmail);
                setPersonAccess(myAccess || null);
            }
        } catch (error) {
            console.error('Error fetching person access:', error);
        }
    }, [currentUser?.email]);

    const adminCreatedBrands = useMemo(() => {
        if (!canViewBrandsCompaniesReport) return [];
        return (accessibleBrands || []).filter((b: any) => {
            const owner = (b?.owner && typeof b.owner === 'object') ? (b.owner.id || b.owner._id) : b?.owner;
            const role = userRoleById.get(String(owner || ''));
            return role === 'admin' || role === 'super_admin';
        });
    }, [accessibleBrands, canViewBrandsCompaniesReport, userRoleById]);

    const managerBrandGroups = useMemo(() => {
        if (!canViewBrandsCompaniesReport) return [] as Array<{ managerId: string; managerLabel: string; brands: Brand[]; companies: string[] }>;

        if (role === 'assistant') return [] as Array<{ managerId: string; managerLabel: string; brands: Brand[]; companies: string[] }>;

        const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();

        const groups = new Map<string, { managerId: string; managerLabel: string; brands: Brand[]; companies: string[] }>();

        (accessibleBrands || []).forEach((b: any) => {
            const owner = (b?.owner && typeof b.owner === 'object') ? (b.owner.id || b.owner._id) : b?.owner;
            const ownerId = String(owner || '');
            if ((role === 'manager' || role === 'marketer_manager') && myId && ownerId !== myId) return;

            const ownerRole = userRoleById.get(ownerId);
            if (ownerRole !== 'manager' && ownerRole !== 'md_manager' && ownerRole !== 'marketer_manager') return;

            const managerLabel = userDisplayById.get(ownerId) || ownerId;
            if (!groups.has(ownerId)) {
                groups.set(ownerId, { managerId: ownerId, managerLabel, brands: [], companies: [] });
            }

            groups.get(ownerId)!.brands.push(b as Brand);
        });

        (companyDocs || []).forEach((c: any) => {
            const creatorId = String(c?.createdBy || c?.owner || '');
            if ((role === 'manager' || role === 'marketer_manager') && myId && creatorId !== myId) return;
            const creatorRole = userRoleById.get(creatorId);
            if (creatorRole !== 'manager' && creatorRole !== 'md_manager' && creatorRole !== 'marketer_manager') return;

            const managerLabel = userDisplayById.get(creatorId) || creatorId;
            if (!groups.has(creatorId)) {
                groups.set(creatorId, { managerId: creatorId, managerLabel, brands: [], companies: [] });
            }

            const name = (c?.name || '').toString().trim();
            if (name && !groups.get(creatorId)!.companies.includes(name)) {
                groups.get(creatorId)!.companies.push(name);
            }
        });

        return Array.from(groups.values()).map(g => ({
            ...g,
            brands: [...g.brands].sort((a: any, b: any) => (a?.name || '').localeCompare(b?.name || '')),
            companies: [...g.companies].sort((a, b) => a.localeCompare(b)),
        })).sort((a, b) => a.managerLabel.localeCompare(b.managerLabel));
    }, [accessibleBrands, companyDocs, canViewBrandsCompaniesReport, currentUser, role, userDisplayById, userRoleById]);


    const getBrandMongoId = useCallback((b: any): string => {
        const raw = String(b?._id || b?.id || '').trim();
        const isObjectId = /^[a-f\d]{24}$/i.test(raw);
        if (isObjectId && b?._id) return String(b._id);
        if (isObjectId) return raw;
        const fallback = String(b?._id || '').trim();
        return /^[a-f\d]{24}$/i.test(fallback) ? fallback : '';
    }, []);

    const getCompanyMongoId = useCallback((c: any): string => {
        const raw = String(c?._id || c?.id || '').trim();
        const isObjectId = /^[a-f\d]{24}$/i.test(raw);
        if (isObjectId && c?._id) return String(c._id);
        if (isObjectId) return raw;
        const fallback = String(c?._id || '').trim();
        return /^[a-f\d]{24}$/i.test(fallback) ? fallback : '';
    }, []);

    const fetchBrands = useCallback(async () => {
        try {
            setIsLoading(true);
            if (role === 'md_manager') {
                const res = await brandService.getBrands({
                    includeDeleted: true,
                    search: filters.search || undefined,
                    status: filters.status !== 'all' ? filters.status : undefined,
                    company: filters.company && filters.company !== 'all' ? filters.company : undefined,
                    page: currentPage,
                    limit: brandsPerPage,
                });
                const raw = Array.isArray((res as any)?.data) ? (res as any).data : [];
                const sortByRecent = (list: Brand[]) => {
                    return [...list].sort((a: any, b: any) => {
                        const dateA = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
                        const dateB = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
                        return dateB - dateA;
                    });
                };

                setApiBrands(sortByRecent(raw));
                setDeletedBrands([]);
                setBrandsTotal(Number((res as any)?.total || raw.length || 0));
                return;
            }
            if (canDeleteBrand) {
                const activeRes = await brandService.getBrands({
                    search: filters.search || undefined,
                    status: filters.status !== 'all' ? filters.status : undefined,
                    company: filters.company && filters.company !== 'all' ? filters.company : undefined,
                    page: currentPage,
                    limit: brandsPerPage,
                });
                const deletedRes = await brandService.getDeletedBrands();

                const rawActive = Array.isArray((activeRes as any)?.data) ? (activeRes as any).data : [];
                const rawDeleted = Array.isArray((deletedRes as any)?.data) ? (deletedRes as any).data : [];

                const sortByRecent = (list: Brand[]) => {
                    return [...list].sort((a: any, b: any) => {
                        const dateA = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
                        const dateB = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
                        return dateB - dateA;
                    });
                };

                setApiBrands(sortByRecent(rawActive));
                setDeletedBrands(sortByRecent(rawDeleted));
                setBrandsTotal(Number((activeRes as any)?.total || rawActive.length || 0));
            } else {
                const response = await brandService.getBrands({
                    search: filters.search || undefined,
                    status: filters.status !== 'all' ? filters.status : undefined,
                    company: filters.company && filters.company !== 'all' ? filters.company : undefined,
                    page: currentPage,
                    limit: brandsPerPage,
                });
                const rawBrands = Array.isArray((response as any)?.data) ? (response as any).data : [];
                if (rawBrands.length > 0) {
                    const allBrands = [...rawBrands].sort((a: Brand, b: Brand) => {
                        const dateA = new Date((a as any).createdAt || (a as any).updatedAt || 0).getTime();
                        const dateB = new Date((b as any).createdAt || (b as any).updatedAt || 0).getTime();
                        return dateB - dateA;
                    });

                    const active = allBrands.filter(brand =>
                        brand.status !== 'deleted' && brand.status !== 'archived'
                    );

                    setApiBrands(active);
                } else {
                    setApiBrands([]);
                }
                setDeletedBrands([]);
                setBrandsTotal(Number((response as any)?.total || rawBrands.length || 0));
            }
        } catch (error: any) {
            console.error('Error fetching brands:', error);
            toast.error('Failed to load brands');
            setApiBrands([]);
            setDeletedBrands([]);
            setBrandsTotal(0);
        } finally {
            setInitialLoadComplete(true);
        }
    }, [canDeleteBrand, role, filters, currentPage, brandsPerPage]);

    const fetchBrandHistoryFeed = useCallback(async () => {
        if (!canViewBrandHistory) {
            setBrandHistoryItems([]);
            setBrandHistoryTotal(0);
            return;
        }
        try {
            const res: any = await brandService.getBrandHistoryFeed({
                includeDeleted: true,
                page: brandHistoryPage,
                limit: brandHistoryLimit,
            });

            const items =
                (Array.isArray(res?.data) ? res.data : null) ||
                (Array.isArray(res?.data?.data) ? res.data.data : null) ||
                (Array.isArray(res?.result) ? res.result : null) ||
                (Array.isArray(res?.result?.data) ? res.result.data : null) ||
                (Array.isArray(res?.items) ? res.items : null) ||
                (Array.isArray(res?.data?.items) ? res.data.items : null) ||
                [];

            const totalRaw =
                res?.total ??
                res?.data?.total ??
                res?.result?.total ??
                res?.data?.pagination?.total ??
                res?.pagination?.total ??
                items.length;

            setBrandHistoryItems(items);
            setBrandHistoryTotal(Number(totalRaw || 0));
        } catch (e: any) {
            console.error('Error fetching brand history feed:', e);
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load brand history');
            setBrandHistoryItems([]);
            setBrandHistoryTotal(0);
        }
    }, [canViewBrandHistory, brandHistoryPage, brandHistoryLimit]);

    useEffect(() => {
        fetchBrandHistoryFeed();
    }, [fetchBrandHistoryFeed]);

    const fetchUsersForAdmin = useCallback(async () => {
        if (!canViewBrandsCompaniesReport) return;
        try {
            const response: any = await authService.getAllUsers();
            if (!response) {
                setAllUsers([]);
                return;
            }

            let rawUsers: any[] = [];
            if (Array.isArray(response)) rawUsers = response;
            else if (Array.isArray(response?.data)) rawUsers = response.data;
            else if (Array.isArray(response?.result)) rawUsers = response.result;
            else if (Array.isArray(response?.result?.data)) rawUsers = response.result.data;

            const normalized = rawUsers.map((u: any) => ({
                ...u,
                id: u?.id || u?._id || u?.userId || '',
                role: u?.role || 'user',
            }));
            setAllUsers(normalized as any);
        } catch (error) {
            console.error('Error fetching users:', error);
            setAllUsers([]);
        }
    }, [canViewBrandsCompaniesReport]);

    const fetchCompaniesForAdmin = useCallback(async () => {
        if (!canViewBrandsCompaniesReport && !canBulkAddCompanies) return;
        try {
            const response = await companyService.getCompanies();
            const list = (response && (response as any).data && Array.isArray((response as any).data)) ? (response as any).data : [];
            setCompanyDocs(list);
        } catch (error) {
            console.error('Error fetching companies:', error);
            setCompanyDocs([]);
        }
    }, [canBulkAddCompanies, canViewBrandsCompaniesReport]);

    const fetchDeletedCompaniesForAdmin = useCallback(async () => {
        if (!canViewBrandsCompaniesReport) return;
        try {
            const response = await companyService.getDeletedCompanies();
            const list = (response && (response as any).data && Array.isArray((response as any).data)) ? (response as any).data : [];
            setDeletedCompanyDocs(list);
        } catch (error) {
            console.error('Error fetching deleted companies:', error);
            setDeletedCompanyDocs([]);
        }
    }, [canViewBrandsCompaniesReport]);

    const fetchTasks = useCallback(async () => {
        if (Array.isArray(propTasks) && propTasks.length > 0) {
            return;
        }
        try {
            const res = await taskService.getAllTasks();
            const safeTasks = Array.isArray((res as any)?.data) ? (res as any).data : [];
            setAllTasks(safeTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setAllTasks([]);
        }
    }, [propTasks]);

    const handleDeleteBrand = useCallback(async (brand: Brand) => {
        if (!canDeleteBrand) {
            toast.error('Access denied');
            return;
        }

        const brandIdStr = getBrandMongoId(brand);
        if (!brandIdStr) {
            toast.error('Cannot delete brand: missing brand id');
            return;
        }
        const brandName = brand.name || 'this brand';

        const reason = window.prompt(`Enter reason for deleting "${brandName}":`, 'No reason provided');

        if (reason === null) {
            return;
        }

        if (!window.confirm(`Are you sure you want to delete "${brandName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await brandService.deleteBrand(brandIdStr, reason);

            if (response && response.success) {
                setApiBrands(prev => prev.filter(b =>
                    String(b.id) !== brandIdStr && String(b._id) !== brandIdStr
                ));

                if (response?.data) {
                    setDeletedBrands(prev => {
                        const deleted = response.data;
                        return deleted ? [...prev, deleted] : prev;
                    });
                }

                setOpenMenuId(null);
                toast.success('Brand deleted successfully!');

                fetchBrands();
            } else {
                toast.error(response?.message || 'Failed to delete brand');
            }
        } catch (error: any) {
            console.error('Error deleting brand:', error);
            toast.error(error?.message || 'Failed to delete brand');
        }
    }, [canDeleteBrand, fetchBrands, getBrandMongoId]);

    const handleCreateBrand = useCallback(async (brandData: any) => {
        try {
            const response = await brandService.createBrand(brandData);
            if (response && response.success) {
                toast.success('Brand created successfully!');
                setShowCreateModal(false);
                fetchBrands();
            } else {
                toast.error('Failed to create brand');
            }
        } catch (error: any) {
            console.error('Error creating brand:', error);
            toast.error(error?.message || 'Failed to create brand');
        }
    }, [fetchBrands]);

    const handleBulkAddBrands = useCallback(async (brands: any[]) => {
        try {
            const res = await brandService.bulkUpsertBrands({ brands });
            if (res.success) {
                toast.success(`${res.data.length} brands processed successfully`);
                setShowBulkAddModal(false);
                fetchBrands();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to bulk add brands');
        }
    }, [fetchBrands]);

    const handleUpdateBrand = useCallback(async (brandData: any) => {
        if (!selectedBrand) return;

        try {
            const brandId = getBrandMongoId(selectedBrand);
            if (!brandId || brandId === 'undefined' || brandId === 'null') {
                toast.error('Cannot update brand: missing brand id');
                throw new Error('Cannot update brand: missing brand id');
            }
            const response = await brandService.updateBrand(brandId, brandData);

            if (response && response.success) {
                toast.success('Brand updated successfully!');
                setShowEditModal(false);
                setSelectedBrand(null);
                fetchBrands();
            } else {
                const message = (response as any)?.message || 'Failed to update brand';
                toast.error(message);
                throw new Error(message);
            }
        } catch (error: any) {
            console.error('Error updating brand:', error);
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to update brand';
            toast.error(message);
            throw error;
        }
    }, [selectedBrand, fetchBrands, getBrandMongoId]);

    const handleEditCompany = useCallback(async (company: any) => {
        if (!canEditCompany) {
            toast.error('Access denied');
            return;
        }

        const companyId = getCompanyMongoId(company);
        if (!companyId) {
            toast.error('Cannot edit company: missing company id');
            return;
        }

        setSelectedCompany(company);
        setShowEditCompanyModal(true);
    }, [canEditCompany, getCompanyMongoId]);

    const handleUpdateCompany = useCallback(async (companyData: { name: string }) => {
        if (!canEditCompany) {
            toast.error('Access denied');
            return;
        }
        if (!selectedCompany) {
            toast.error('No company selected');
            return;
        }

        const companyId = getCompanyMongoId(selectedCompany);
        if (!companyId) {
            toast.error('Cannot update company: missing company id');
            return;
        }

        try {
            const res = await companyService.updateCompany(companyId, { name: String(companyData?.name || '').trim() });
            if (res?.success) {
                toast.success('Company updated successfully');
                setShowEditCompanyModal(false);
                setSelectedCompany(null);
                await fetchCompaniesForAdmin();
            } else {
                toast.error(res?.message || 'Failed to update company');
                throw new Error(res?.message || 'Failed to update company');
            }
        } catch (error: any) {
            console.error('Error updating company:', error);
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Failed to update company';
            toast.error(message);
            throw error;
        }
    }, [canEditCompany, fetchCompaniesForAdmin, getCompanyMongoId, selectedCompany]);

    const handleDeleteCompany = useCallback(async (company: any) => {
        if (!canDeleteCompany) {
            toast.error('Access denied');
            return;
        }

        const companyId = getCompanyMongoId(company);
        if (!companyId) {
            toast.error('Cannot delete company: missing company id');
            return;
        }

        const name = String(company?.name || 'this company');
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        try {
            const res = await companyService.deleteCompany(companyId);
            if (res?.success) {
                toast.success('Company deleted successfully');
                await fetchCompaniesForAdmin();
                await fetchDeletedCompaniesForAdmin();
            } else {
                toast.error(res?.message || 'Failed to delete company');
            }
        } catch (error: any) {
            console.error('Error deleting company:', error);

            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Failed to delete company';
            toast.error(message);
        }
    }, [canDeleteCompany, fetchCompaniesForAdmin, fetchDeletedCompaniesForAdmin, getCompanyMongoId]);

    const getFilteredBrands = useCallback((): Brand[] => {
        let list = Array.isArray(accessibleBrands) ? [...accessibleBrands] : [];

        if (filters.status !== 'all') {
            list = list.filter((b) => b.status === filters.status);
        }
        if (filters.company !== 'all') {
            const companyLower = filters.company.toLowerCase();
            list = list.filter((b) => (b.company || '').toLowerCase() === companyLower);
        }
        if (filters.brand !== 'all') {
            const brandLower = filters.brand.toLowerCase();
            list = list.filter((b) => (b.name || '').toLowerCase() === brandLower);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter((b) => {
                const name = (b.name || '').toLowerCase();
                const company = (b.company || '').toLowerCase();
                const groupNumber = String((b as any)?.groupNumber || '').trim().toLowerCase();
                const groupName = String((b as any)?.groupName || '').trim().toLowerCase();
                return name.includes(q) || company.includes(q) || groupNumber.includes(q) || groupName.includes(q);
            });
        }

        return list;
    }, [accessibleBrands, filters]);

    const getBrandLabelForFilter = (brandName: string): string => {
        const name = String(brandName || '').trim();
        if (!name) return '';

        const candidate = (accessibleBrands || []).find((b: any) => {
            const n = String(b?.name || '').trim().toLowerCase();
            if (n !== name.toLowerCase()) return false;

            if (filters.company !== 'all') {
                return String(b?.company || '').trim() === String(filters.company || '').trim();
            }

            return true;
        });

        if (!candidate) return name;

        const company = String((candidate as any).company || '').trim();
        const groupNumber = String((candidate as any).groupNumber || '').trim();

        if (company === 'speed Ecom' && groupNumber) {
            return `${groupNumber} - ${name}`;
        }

        return name;
    };

    const filteredBrands = getFilteredBrands();
    const totalBrands = Number(brandsTotal || 0);
    const totalPages = Math.max(1, Math.ceil(totalBrands / brandsPerPage));
    const currentPageSafe = Math.min(currentPage, totalPages);

    const paginatedBrands = useMemo(() => {
        return filteredBrands as Brand[];
    }, [filteredBrands]);

    const brandTaskCounts = useMemo(() => {
        const map = new Map<string, number>();
        (Array.isArray(reportTasks) ? reportTasks : []).forEach((t: any) => {
            const brandId = String(t?.brandId || t?.brand?._id || t?.brand?.id || '').trim();
            if (!brandId) return;
            map.set(brandId, (map.get(brandId) || 0) + 1);
        });
        return map;
    }, [reportTasks]);

    const startItemIndex = totalBrands === 0 ? 0 : (currentPageSafe - 1) * brandsPerPage + 1;
    const endItemIndex = totalBrands === 0 ? 0 : Math.min(startItemIndex + (paginatedBrands.length || 0) - 1, totalBrands);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, brandsPerPage]);

    const getDisplayedTasks = useCallback((): Task[] => {
        const tasks: Task[] = Array.isArray(reportTasks) ? reportTasks : [];
        if (!taskDisplayType) return [];

        const brandsForFilter = getFilteredBrands();
        const brandIds = new Set(brandsForFilter.map((b: any) => String(b?.id || b?._id || '')).filter(Boolean));
        const brandPairs = new Set(
            brandsForFilter.map((b: any) => `${String(b?.name || '').toLowerCase()}|${String(b?.company || '').toLowerCase()}`)
        );

        const matchesAnyBrand = (task: any) => {
            const brandId = task?.brandId ? String(task.brandId) : '';
            if (brandId && brandIds.has(brandId)) return true;

            const taskBrand = (typeof task?.brand === 'string' ? task.brand : task?.brand?.name || '').toString().toLowerCase();
            const taskCompany = (task?.companyName || task?.company || '').toString().toLowerCase();
            if (taskBrand && taskCompany) return brandPairs.has(`${taskBrand}|${taskCompany}`);
            if (taskBrand) return brandsForFilter.some((b: any) => String(b?.name || '').toLowerCase() === taskBrand);
            return false;
        };

        if (taskDisplayType === 'total-brands') {
            return tasks.filter(matchesAnyBrand);
        }

        if (taskDisplayType === 'active-brands') {
            const activeBrands = brandsForFilter.filter((b: any) => b?.status === 'active');
            const activeBrandIds = new Set(activeBrands.map((b: any) => String(b?.id || b?._id || '')).filter(Boolean));
            const activePairs = new Set(
                activeBrands.map((b: any) => `${String(b?.name || '').toLowerCase()}|${String(b?.company || '').toLowerCase()}`)
            );

            return tasks.filter((task: any) => {
                const brandId = task?.brandId ? String(task.brandId) : '';
                if (brandId && activeBrandIds.has(brandId)) return true;
                const taskBrand = (typeof task?.brand === 'string' ? task.brand : task?.brand?.name || '').toString().toLowerCase();
                const taskCompany = (task?.companyName || task?.company || '').toString().toLowerCase();
                if (taskBrand && taskCompany) return activePairs.has(`${taskBrand}|${taskCompany}`);
                if (taskBrand) return activeBrands.some((b: any) => String(b?.name || '').toLowerCase() === taskBrand);
                return false;
            });
        }

        if (taskDisplayType === 'total-tasks') {
            const activeFilterCount = getActiveFilterCount();
            if (activeFilterCount === 0 && !filters.search) return tasks;
            return tasks.filter(matchesAnyBrand);
        }

        return [];
    }, [reportTasks, taskDisplayType, getFilteredBrands, getActiveFilterCount, filters.search]);

    const resetFilters = useCallback(() => {
        setFilters({
            status: 'all',
            company: 'all',
            category: 'all',
            search: '',
            brand: 'all',
        });
        setTaskDisplayType(null);
    }, []);

    const calculateStats = useCallback(() => {
        const safeBrands = Array.isArray(accessibleBrands) ? accessibleBrands : [];
        const safeTasks = Array.isArray(reportTasks) ? reportTasks : [];

        const hasActiveFilters = getActiveFilterCount() > 0 || Boolean(filters.search);
        const totalBrands = hasActiveFilters ? safeBrands.length : Number(brandsTotal || 0);
        const activeBrands = hasActiveFilters
            ? safeBrands.filter((brand) => brand.status === 'active').length
            : Number(brandsTotal || 0);
        const totalTasks = safeTasks.length;
        const averageTasksPerBrand = totalBrands > 0 ? totalTasks / totalBrands : 0;

        setStats({
            totalBrands,
            activeBrands,
            totalTasks,
            averageTasksPerBrand: Number(averageTasksPerBrand.toFixed(1)),
        });
    }, [accessibleBrands, reportTasks, brandsTotal, filters.search, getActiveFilterCount]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                await Promise.all([
                    fetchBrands(),
                    fetchTasks(),
                    fetchUsersForAdmin(),
                    fetchCompaniesForAdmin(),
                    fetchDeletedCompaniesForAdmin(),
                    fetchPersonAccess(),
                ]);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [fetchBrands, fetchTasks, fetchUsersForAdmin, fetchCompaniesForAdmin, fetchDeletedCompaniesForAdmin, fetchPersonAccess]);

    useEffect(() => {
        const handler = () => {
            void fetchBrands();
        };

        window.addEventListener('brandUpdated', handler as any);

        return () => {
            window.removeEventListener('brandUpdated', handler as any);
        };
    }, [fetchBrands]);

    useEffect(() => {
        if (!isLoading) {
            calculateStats();
        }
    }, [isLoading, calculateStats]);

    const availableBrandsForFilter = useMemo(() => {
        let list = accessibleBrands;
        if (filters.company !== 'all') {
            list = accessibleBrands.filter((b) => b.company === filters.company);
        }
        return [...new Set(list.map((b) => b.name))].filter(Boolean).sort();
    }, [accessibleBrands, filters.company]);

    const isNewBrand = useCallback((brand: Brand) => {
        if (!brand.createdAt) return false;
        try {
            const createdTime = new Date(brand.createdAt).getTime();
            const now = new Date().getTime();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            return createdTime > fiveMinutesAgo;
        } catch (error) {
            return false;
        }
    }, []);

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return 'No date';
        try {
            return new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const formatDateTime = (date: string | Date | undefined) => {
        if (!date) return 'No date';
        try {
            return new Date(date).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return formatDate(date);
        }
    };

    const formatHistoryValue = (value: any) => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'string') return value.trim() ? value : '—';
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value === 'object') {
            const name = (value as any)?.name;
            if (typeof name === 'string' && name.trim()) return name;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    };

    const getHistoryIcon = (action: string) => {
        const a = (action || '').toLowerCase();
        if (a.includes('delete')) return <Trash2 className="h-4 w-4 text-red-600" />;
        if (a.includes('restore')) return <CheckCircle className="h-4 w-4 text-green-600" />;
        if (a.includes('create')) return <CheckCircle className="h-4 w-4 text-blue-600" />;
        if (a.includes('status')) return <AlertCircle className="h-4 w-4 text-amber-600" />;
        if (a.includes('update')) return <Edit className="h-4 w-4 text-indigo-600" />;
        return <History className="h-4 w-4 text-gray-600" />;
    };

    const getTaskStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case 'in-progress':
                return <Clock className="h-4 w-4 text-blue-500" />;
            case 'pending':
                return <AlertCircle className="h-4 w-4 text-amber-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTaskStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'in-progress': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    const getTaskPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-blue-50 text-blue-700 border-blue-100';
        }
    };

    const getTaskPriorityIcon = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high':
                return <AlertTriangle className="h-4 w-4 text-rose-500" />;
            case 'medium':
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-blue-500" />;
        }
    };

    const getStatusColor = useCallback((status: BrandStatus) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'inactive':
                return 'bg-gray-50 text-gray-600 border-gray-100';
            case 'archived':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    }, []);

    const getStatusIcon = useCallback((status: BrandStatus) => {
        switch (status) {
            case 'active':
                return <Activity className="h-3.5 w-3.5" />;
            case 'inactive':
                return <Calendar className="h-3.5 w-3.5" />;
            case 'archived':
                return <Package className="h-3.5 w-3.5" />;
            default:
                return <Building className="h-3.5 w-3.5" />;
        }
    }, []);

    const handleRestoreBrand = useCallback(async (brand: Brand) => {
        if (!canDeleteBrand) {
            toast.error('Access denied');
            return;
        }

        const brandIdStr = String(brand.id || brand._id || '');
        const brandName = brand.name || 'this brand';

        if (!window.confirm(`Are you sure you want to restore "${brandName}"?`)) {
            return;
        }

        try {
            const response = await brandService.restoreBrand(brandIdStr);

            if (response && response.success) {
                setDeletedBrands(prev => prev.filter(b =>
                    String(b.id) !== brandIdStr && String(b._id) !== brandIdStr
                ));

                setApiBrands(prev => [...prev, response.data]);

                toast.success('Brand restored successfully!');

                fetchBrands();
            } else {
                toast.error('Failed to restore brand');
            }
        } catch (error: any) {
            console.error('Error restoring brand:', error);
            toast.error(error?.message || 'Failed to restore brand');
        }
    }, [canDeleteBrand, fetchBrands]);

    const handleBrandClick = useCallback((brandId: string) => {
        if (onSelectBrand) {
            onSelectBrand(brandId);
            return;
        }
        navigate(`/brands/${brandId}`);
    }, [navigate, onSelectBrand]);

    const handleEditClick = useCallback((brand: Brand, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedBrand(brand);
        setShowEditModal(true);
        setOpenMenuId(null);
    }, []);

    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setTaskDisplayType(null);
    }, []);

    const handleStatsCardClick = useCallback((type: TaskDisplayType) => {
        if (taskDisplayType === type) {
            setTaskDisplayType(null);
        } else {
            setTaskDisplayType(type);
        }
    }, [taskDisplayType]);

    const getTaskDisplayTitle = useCallback(() => {
        const activeFilterCount = getActiveFilterCount();
        switch (taskDisplayType) {
            case 'total-brands':
                return `Tasks for ${activeFilterCount > 0 || filters.search ? 'Filtered' : 'All'} Brands`;
            case 'active-brands':
                return 'Tasks for Active Brands';
            case 'total-tasks':
                return 'All Tasks';
            default:
                if (activeFilterCount > 0 || filters.search) {
                    return 'Filtered Tasks';
                }
                return 'Related Tasks';
        }
    }, [taskDisplayType, getActiveFilterCount, filters.search]);

    const displayedTasks = getDisplayedTasks();

    const containerClasses = useMemo(() => {
        return `
            max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
            transition-all duration-300 ease-in-out
        `;
    }, []);

    const LoadingSkeleton = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className={containerClasses}>
                <div className="py-8">
                    {/* Header Skeleton */}
                    <div className="mb-8">
                        <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
                        <div className="h-5 w-80 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>

                    {/* Stats Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                        <div className="h-8 w-16 bg-gray-300 rounded animate-pulse"></div>
                                    </div>
                                    <div className="h-12 w-12 bg-gray-200 rounded-xl animate-pulse"></div>
                                </div>
                                <div className="h-3 w-32 bg-gray-200 rounded mt-3 animate-pulse"></div>
                            </div>
                        ))}
                    </div>

                    {/* Filters Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                            <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                        </div>
                    </div>

                    {/* Brands Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                                        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
                                </div>
                                <div className="h-8 w-24 bg-gray-200 rounded-full mb-4 animate-pulse"></div>
                                <div className="space-y-3 mb-5">
                                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <div className="h-10 flex-1 bg-gray-200 rounded-lg animate-pulse"></div>
                                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    if (isLoading && !initialLoadComplete) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className={containerClasses}>
                <div className="py-6 lg:py-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: colors.primary.ultralight }}>
                                        <Building className="h-6 w-6" style={{ color: colors.primary.main }} />
                                    </div>
                                    <h1 className="text-1xl lg:text-2xl font-bold text-gray-900">Brands</h1>
                                </div>
                                <p className="text-gray-500 text-sm">Manage and track all your brands in one place</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {canBulkAddBrands && (
                                    <button
                                        onClick={() => setShowBulkAddModal(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm hover:shadow-md transition-all duration-200"
                                        style={{ backgroundColor: colors.primary.main }}
                                    >
                                        <Upload className="h-4 w-4" />
                                        Bulk Add
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div
                            onClick={() => handleStatsCardClick('total-brands')}
                            className={`group bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${taskDisplayType === 'total-brands'
                                ? 'border-blue-500 ring-2 ring-blue-100'
                                : 'border-gray-100 hover:border-blue-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Brands</p>
                                    <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                                        {getActiveFilterCount() > 0 || filters.search ? filteredBrands.length : stats.totalBrands}
                                    </p>
                                </div>
                                <div className={`p-2 rounded-lg transition-colors duration-200 ${taskDisplayType === 'total-brands'
                                    ? 'bg-blue-100'
                                    : 'bg-gray-50 group-hover:bg-blue-50'
                                    }`}>
                                    <Layers className={`h-5 w-5 ${taskDisplayType === 'total-brands'
                                        ? 'text-blue-600'
                                        : 'text-gray-400 group-hover:text-blue-500'
                                        }`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                <span className="text-xs text-gray-500">+12% from last month</span>
                            </div>
                        </div>

                        <div
                            onClick={() => handleStatsCardClick('active-brands')}
                            className={`group bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${taskDisplayType === 'active-brands'
                                ? 'border-emerald-500 ring-2 ring-emerald-100'
                                : 'border-gray-100 hover:border-emerald-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Brands</p>
                                    <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                                        {getActiveFilterCount() > 0 || filters.search
                                            ? filteredBrands.filter(brand => brand.status === 'active').length
                                            : stats.activeBrands}
                                    </p>
                                </div>
                                <div className={`p-2 rounded-lg transition-colors duration-200 ${taskDisplayType === 'active-brands'
                                    ? 'bg-emerald-100'
                                    : 'bg-gray-50 group-hover:bg-emerald-50'
                                    }`}>
                                    <Sparkles className={`h-5 w-5 ${taskDisplayType === 'active-brands'
                                        ? 'text-emerald-600'
                                        : 'text-gray-400 group-hover:text-emerald-500'
                                        }`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                                <span className="text-xs text-gray-500">
                                    {getActiveFilterCount() > 0 || filters.search
                                        ? `${Math.round((filteredBrands.filter(b => b.status === 'active').length / Math.max(filteredBrands.length, 1)) * 100)}% of filtered`
                                        : `${Math.round((stats.activeBrands / Math.max(stats.totalBrands, 1)) * 100)}% of total`
                                    }
                                </span>
                            </div>
                        </div>

                        <div
                            onClick={() => handleStatsCardClick('total-tasks')}
                            className={`group bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${taskDisplayType === 'total-tasks'
                                ? 'border-purple-500 ring-2 ring-purple-100'
                                : 'border-gray-100 hover:border-purple-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tasks</p>
                                    <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                                        {displayedTasks.length > 0 && taskDisplayType === 'total-tasks'
                                            ? displayedTasks.length
                                            : stats.totalTasks
                                        }
                                    </p>
                                </div>
                                <div className={`p-2 rounded-lg transition-colors duration-200 ${taskDisplayType === 'total-tasks'
                                    ? 'bg-purple-100'
                                    : 'bg-gray-50 group-hover:bg-purple-50'
                                    }`}>
                                    <BarChart3 className={`h-5 w-5 ${taskDisplayType === 'total-tasks'
                                        ? 'text-purple-600'
                                        : 'text-gray-400 group-hover:text-purple-500'
                                        }`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingDown className="h-3 w-3 text-rose-500" />
                                <span className="text-xs text-gray-500">-5% from last week</span>
                            </div>
                        </div>
                    </div>

                    {/* Deleted Brands Section */}
                    {canDeleteBrand && showDeletedBrands && (adminDeletedBrands?.length || 0) > 0 && (
                        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-rose-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <History className="h-5 w-5 text-rose-500" />
                                        Deleted Brands
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        These brands have been deleted and are only visible to admins
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDeletedBrands(false)}
                                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {adminDeletedBrands.map((brand) => (
                                    <div key={String(brand.id)} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/30 px-4 py-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor('deleted')}`}>
                                                    {getStatusIcon('deleted')}
                                                    <span className="ml-1.5">Deleted</span>
                                                </div>
                                                <div className="text-sm font-medium text-gray-900 truncate">{brand.name}</div>
                                            </div>
                                            <div className="text-xs text-gray-500 truncate mt-1">
                                                Company: {brand.company} | Deleted by: {brand.deletedBy || 'Unknown'} | Deleted on: {brand.deletedAt ? new Date(brand.deletedAt).toLocaleDateString() : 'Unknown'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRestoreBrand(brand)}
                                                className="px-3 py-1.5 text-xs font-medium bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 border border-emerald-200 transition-colors flex items-center gap-1"
                                            >
                                                <ArrowUpRight className="h-3 w-3" />
                                                Restore
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to permanently delete this brand? This action cannot be undone.')) {
                                                        handleDeleteBrand(brand);
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium bg-white text-rose-700 rounded-lg hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filters Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Filters
                                {getActiveFilterCount() > 0 && (
                                    <span className="ml-1 bg-blue-100 text-blue-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                                        {getActiveFilterCount()}
                                    </span>
                                )}
                            </button>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search brands..."
                                    value={filters.search}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, search: e.target.value }));
                                        setTaskDisplayType(null);
                                    }}
                                    className="w-full md:w-64 pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                                />
                            </div>
                            {(taskDisplayType || displayedTasks.length > 0) && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                                    <span className="text-xs font-medium">
                                        {displayedTasks.length} tasks shown
                                    </span>
                                    <button
                                        onClick={() => setTaskDisplayType(null)}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500">
                                {filteredBrands.length === 0
                                    ? 'No brands to display'
                                    : `Showing ${startItemIndex}-${endItemIndex} of ${filteredBrands.length} brands`}
                            </div>
                            <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-2.5 py-1 rounded-md transition-all duration-200 ${viewMode === 'grid'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    title="Grid View"
                                >
                                    <Grid className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-2.5 py-1 rounded-md transition-all duration-200 ${viewMode === 'list'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    title="List View"
                                >
                                    <List className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-gray-500" />
                                    <h3 className="text-base font-semibold text-gray-900">Advanced Filters</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={resetFilters}
                                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
                                        Status
                                    </label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
                                        Company
                                    </label>
                                    <select
                                        value={filters.company}
                                        onChange={(e) => handleFilterChange('company', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        <option value="all">All Companies</option>
                                        {companies.map(company => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
                                        Brand
                                    </label>
                                    <select
                                        value={filters.brand}
                                        onChange={(e) => handleFilterChange('brand', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        <option value="all">All Brands</option>
                                        {availableBrandsForFilter.map((brandName) => (
                                            <option key={brandName} value={brandName}>
                                                {getBrandLabelForFilter(brandName)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Brands Content */}
                    <div className="mb-8">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {getActiveFilterCount() > 0 || filters.search ? 'Filtered Brands' : 'All Brands'}
                            </h2>
                        </div>

                        {filteredBrands.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                                <div className="max-w-md mx-auto">
                                    <div className="p-4 bg-gray-50 rounded-2xl inline-flex mb-4">
                                        <Building className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        No brands found
                                    </h3>
                                    <p className="text-gray-500 text-sm">
                                        {getActiveFilterCount() > 0 || filters.search
                                            ? 'Try adjusting your filters or search term'
                                            : 'No brands available. Create your first brand to get started.'
                                        }
                                    </p>
                                </div>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedBrands.map((brand) => {
                                    const taskCount = brandTaskCounts.get(String(brand.id)) || 0;
                                    return (
                                        <div
                                            key={brand.id}
                                            className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer relative"
                                            onClick={() => handleBrandClick(String(brand.id))}
                                        >
                                            {/* Company Badge */}
                                            <div className="absolute top-4 right-4">
                                                <div className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                                                    {brand.company}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 rounded-xl" style={{ backgroundColor: colors.primary.ultralight }}>
                                                        <Building className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                {brand.company == "speed Ecom" ? brand.groupNumber + " - " + brand.name : brand.name}
                                                            </h3>
                                                            {isNewBrand(brand) && (
                                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full animate-pulse">
                                                                    NEW
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {(canEditBrand || canDeleteBrand) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const brandIdStr = String(brand.id);
                                                            setOpenMenuId(openMenuId === brandIdStr ? null : brandIdStr);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(brand.status)}`}>
                                                    {getStatusIcon(brand.status)}
                                                    <span className="ml-1.5 capitalize">{brand.status}</span>
                                                </div>
                                            </div>

                                            {/* Stats Section */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                        <BarChart3 className="h-3.5 w-3.5" />
                                                        Total Tasks
                                                    </span>
                                                    <span className="font-semibold text-gray-900">
                                                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBrandClick(String(brand.id));
                                                    }}
                                                    className="flex-1 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                                                    style={{ backgroundColor: colors.primary.ultralight, color: colors.primary.main }}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    View Details
                                                </button>
                                                {canEditBrand && (
                                                    <button
                                                        onClick={(e) => handleEditClick(brand, e)}
                                                        className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Dropdown Menu */}
                                            {openMenuId === String(brand.id) && (canEditBrand || canDeleteBrand) && (
                                                <div className="absolute right-5 top-16 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                                                    {canEditBrand && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(brand, e);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                            Edit Brand
                                                        </button>
                                                    )}
                                                    {canDeleteBrand && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteBrand(brand);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Delete Brand
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Brand Details
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Company
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tasks
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {paginatedBrands.map((brand) => {
                                                const taskCount = brandTaskCounts.get(String(brand.id)) || 0;
                                                return (
                                                    <tr
                                                        key={brand.id}
                                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                        onClick={() => handleBrandClick(String(brand.id))}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <div className="p-2 rounded-xl mr-3" style={{ backgroundColor: colors.primary.ultralight }}>
                                                                    <Building className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-gray-900">
                                                                            {brand.name}
                                                                        </span>
                                                                        {isNewBrand(brand) && (
                                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                                                                NEW
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-600">{brand.company}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(brand.status)}`}>
                                                                {getStatusIcon(brand.status)}
                                                                <span className="ml-1.5 capitalize">{brand.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-semibold text-gray-900">{taskCount}</span>
                                                                <span className="text-xs text-gray-500">{taskCount === 1 ? 'task' : 'tasks'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleBrandClick(String(brand.id));
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                                                    style={{ backgroundColor: colors.primary.ultralight, color: colors.primary.main }}
                                                                >
                                                                    <Eye className="h-3 w-3" />
                                                                    View
                                                                </button>
                                                                {canEditBrand && (
                                                                    <button
                                                                        onClick={(e) => handleEditClick(brand, e)}
                                                                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                                                                    >
                                                                        <Edit className="h-3 w-3" />
                                                                        Edit
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {filteredBrands.length > 0 && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 mt-4">
                                <div className="text-sm text-gray-500">
                                    Showing {startItemIndex}-{endItemIndex} of {filteredBrands.length} brands
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={String(brandsPerPage)}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            if (!Number.isFinite(next)) return;
                                            setBrandsPerPage(next);
                                            setCurrentPage(1);
                                        }}
                                        className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                                    >
                                        {PAGE_SIZE_OPTIONS.map((n) => (
                                            <option key={n} value={String(n)}>
                                                {n} per page
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPageSafe === 1}
                                            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm text-gray-600 px-3">
                                            Page {currentPageSafe} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPageSafe === totalPages}
                                            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Admin Reports Section */}
                    {/* Admin Reports Section */}
                    {canViewBrandsCompaniesReport && (
                        <div className="mt-8">
                            {/* Main Container with Gradient Border */}
                            <div className="relative bg-white rounded-2xl shadow-lg border overflow-hidden" style={{ borderColor: 'rgba(30, 58, 138, 0.1)' }}>
                                {/* Decorative Top Bar */}
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${colors.primary.main}, ${colors.primary.light})` }}></div>

                                {/* Header */}
                                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                <BarChart3 className="h-5 w-5" style={{ color: colors.primary.main }} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">Brands & Companies Report</h2>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    Admin-created brands on the left, manager-created brands and companies on the right
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                <Building className="h-4 w-4" style={{ color: colors.primary.main }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Two Column Layout */}
                                    <div className={`grid grid-cols-1 ${role === 'admin' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>

                                        {/* Admin Brands Card */}
                                        {role === 'admin' && (
                                            <div className="rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-md" style={{ borderColor: `${colors.primary.main}20` }}>
                                                <div className="px-5 py-4 border-b" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}10` }}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                                <Star className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                            </div>
                                                            <h3 className="text-base font-semibold text-gray-900">Admin Brands</h3>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                            <span className="text-sm font-bold" style={{ color: colors.primary.main }}>{adminCreatedBrands.length}</span>
                                                            <span className="text-xs text-gray-500">brands</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-5">
                                                    {adminCreatedBrands.length === 0 ? (
                                                        <div className="text-center py-8">
                                                            <div className="inline-flex p-3 rounded-full bg-gray-50 mb-2">
                                                                <Building className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                            <p className="text-sm text-gray-500">No admin-created brands found.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                                            {adminCreatedBrands.map((b, idx) => (
                                                                <div
                                                                    key={String(b.id)}
                                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-100"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-medium text-gray-400">#{idx + 1}</span>
                                                                            <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-0.5">{b.company}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 ml-3">
                                                                        {canEditBrand && (
                                                                            <button
                                                                                onClick={(e) => handleEditClick(b, e)}
                                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        )}
                                                                        {canDeleteBrand && (
                                                                            <button
                                                                                onClick={() => handleDeleteBrand(b)}
                                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Manager Brands & Companies Card */}
                                        <div className="rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-md" style={{ borderColor: `${colors.primary.main}20` }}>
                                            <div className="px-5 py-4 border-b" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}10` }}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                            <Users className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                        </div>
                                                        <h3 className="text-base font-semibold text-gray-900">Manager Portfolios</h3>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                        <span className="text-sm font-bold" style={{ color: colors.primary.main }}>{managerBrandGroups.length}</span>
                                                        <span className="text-xs text-gray-500">managers</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5">
                                                {managerBrandGroups.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <div className="inline-flex p-3 rounded-full bg-gray-50 mb-2">
                                                            <Users className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <p className="text-sm text-gray-500">No manager-created brands/companies found.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                                                        {managerBrandGroups.map((group) => (
                                                            <div key={group.managerId} className="rounded-lg border overflow-hidden" style={{ borderColor: `${colors.primary.main}15` }}>
                                                                <div className="px-4 py-3" style={{ backgroundColor: `${colors.primary.main}05` }}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.primary.main}15` }}>
                                                                                <span className="text-xs font-bold" style={{ color: colors.primary.main }}>
                                                                                    {group.managerLabel.charAt(0).toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-sm font-semibold text-gray-900">{group.managerLabel}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.primary.main}10`, color: colors.primary.main }}>
                                                                                {group.brands.length} brands
                                                                            </span>
                                                                            {group.companies.length > 0 && (
                                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                                                    {group.companies.length} companies
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="p-4 space-y-3">
                                                                    {group.companies.length > 0 && (
                                                                        <div>
                                                                            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                                                                <Building className="h-3 w-3" />
                                                                                Companies
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {group.companies.map((c) => (
                                                                                    <span key={c} className="text-xs px-2 py-1 bg-gray-50 rounded-lg text-gray-600 border border-gray-100">
                                                                                        {c}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div>
                                                                        <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                                                            <Layers className="h-3 w-3" />
                                                                            Brands
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            {group.brands.map((b) => (
                                                                                <div key={String(b.id)} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="text-sm font-medium text-gray-800 truncate">{b.name}</div>
                                                                                        <div className="text-xs text-gray-500">{b.company}</div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 ml-2">
                                                                                        {canEditBrand && (
                                                                                            <button
                                                                                                onClick={(e) => handleEditClick(b, e)}
                                                                                                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                                                            >
                                                                                                <Edit className="h-3 w-3" />
                                                                                            </button>
                                                                                        )}
                                                                                        {canDeleteBrand && (
                                                                                            <button
                                                                                                onClick={() => handleDeleteBrand(b)}
                                                                                                className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                                                                            >
                                                                                                <Trash2 className="h-3 w-3" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Companies Table - Modern Design */}
                                    <div className="mt-6 rounded-xl border overflow-hidden" style={{ borderColor: `${colors.primary.main}20` }}>
                                        <div className="px-5 py-4 border-b" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}10` }}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                        <Building className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-base font-semibold text-gray-900">Company Directory</h2>
                                                        <p className="text-xs text-gray-500 mt-0.5">Complete list of all companies</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                    <span className="text-sm font-bold" style={{ color: colors.primary.main }}>{companiesForReport.length}</span>
                                                    <span className="text-xs text-gray-500">total</span>
                                                </div>
                                            </div>
                                        </div>

                                        {companiesForReport.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="inline-flex p-4 rounded-full bg-gray-50 mb-3">
                                                    <Building className="h-6 w-6 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-500">No companies found.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-100">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company Name</th>
                                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created By</th>
                                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Updated</th>
                                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-50">
                                                        {companiesForReport.map((c: any) => {
                                                            const companyId = String(c?.id || c?._id || '');
                                                            const creatorId = String(c?.createdBy || '');
                                                            const creatorLabel = creatorId ? (userDisplayById.get(creatorId) || creatorId) : '-';

                                                            return (
                                                                <tr key={companyId || String(c?.name || '')} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                                                <Building className="h-3.5 w-3.5" style={{ color: colors.primary.main }} />
                                                                            </div>
                                                                            <div className="text-sm font-medium text-gray-900">{String(c?.name || '')}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                                                <span className="text-xs font-medium" style={{ color: colors.primary.main }}>{creatorLabel.charAt(0).toUpperCase()}</span>
                                                                            </div>
                                                                            <span className="text-sm text-gray-600">{creatorLabel}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-500">{formatDateTime(c?.createdAt)}</span>
                                                                    </td>
                                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-500">{formatDateTime(c?.updatedAt)}</span>
                                                                    </td>
                                                                    <td className="px-5 py-3 whitespace-nowrap text-right">
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            {canEditCompany && (
                                                                                <button
                                                                                    onClick={() => handleEditCompany(c)}
                                                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                                                                    title="Edit"
                                                                                >
                                                                                    <Edit className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            )}
                                                                            {canDeleteCompany && (
                                                                                <button
                                                                                    onClick={() => handleDeleteCompany(c)}
                                                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                                    title="Delete"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>



                                    {/* Activity Timeline - Company & Brand History */}
                                    <div className="mt-6 rounded-xl border overflow-hidden" style={{ borderColor: `${colors.primary.main}20` }}>
                                        <div className="px-5 py-4 border-b" style={{ backgroundColor: `${colors.primary.main}05`, borderColor: `${colors.primary.main}10` }}>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                    <History className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-semibold text-gray-900">Activity Timeline</h2>
                                                    <p className="text-xs text-gray-500 mt-0.5">Recent brand and company activity</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 space-y-6">
                                            {/* Company History */}
                                            {recentCompanyActivity.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Building className="h-4 w-4" style={{ color: colors.primary.main }} />
                                                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Company Activity</h3>
                                                        <span className="text-xs text-gray-400">({recentCompanyActivity.length} total)</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {recentCompanyActivity.slice(0, 5).map((h: any, idx: number) => {
                                                            const action = String(h?.action || '').toLowerCase();
                                                            const actor = (h?.userName || h?.userEmail || 'Unknown').toString();
                                                            const when = h?.timestamp;
                                                            const field = h?.field;
                                                            const oldValue = h?.oldValue;
                                                            const newValue = h?.newValue;

                                                            return (
                                                                <div key={`company-${h?._companyId}-${idx}`} className="group relative pl-4 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                                                            <div className="mt-0.5">{getHistoryIcon(action)}</div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="text-sm font-medium text-gray-900">
                                                                                    {h?._companyName || 'Company'}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                                    {(h?.message || '').toString() || action}
                                                                                </div>
                                                                                {field !== undefined && (oldValue !== undefined || newValue !== undefined) && (
                                                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                                        <span className="font-medium text-gray-600">{String(field)}:</span>
                                                                                        <span className="text-gray-400 line-through">{formatHistoryValue(oldValue)}</span>
                                                                                        <ArrowRight className="h-2.5 w-2.5 text-gray-400" />
                                                                                        <span className="text-gray-600">{formatHistoryValue(newValue)}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <div className="text-xs text-gray-500">{actor}</div>
                                                                            <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(when)}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Brand History */}
                                            {brandHistoryItems.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Layers className="h-3.5 w-3.5" style={{ color: colors.primary.main }} />
                                                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand Activity</h3>
                                                        <span className="text-xs text-gray-400 p-4 ">({brandHistoryTotal} total)</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {brandHistoryItems.slice(0, 5).map((h: any, idx: number) => {
                                                            const action = String((h as any)?.action || '').toLowerCase();
                                                            const actor = (h?.userName || h?.userEmail || 'Unknown').toString();
                                                            const when = (h as any)?.timestamp;
                                                            const field = (h as any)?.field;
                                                            const oldValue = (h as any)?.oldValue;
                                                            const newValue = (h as any)?.newValue;

                                                            return (
                                                                <div key={`brand-${String(h?._brandId || '')}-${idx}`} className="group relative pl-4 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                                                            <div className="mt-0.5">{getHistoryIcon(action)}</div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="text-sm font-medium text-gray-900">
                                                                                    {(h?._brandGroupNumber ? `${h._brandGroupNumber} - ` : '')}{h?._brandName || 'Brand'}
                                                                                    {h?._brandCompany && <span className="text-xs text-gray-400 ml-1">({h._brandCompany})</span>}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                                    {(h?.message || '').toString() || action}
                                                                                </div>
                                                                                {field !== undefined && (oldValue !== undefined || newValue !== undefined) && (
                                                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                                        <span className="font-medium text-gray-600">{String(field)}:</span>
                                                                                        <span className="text-gray-400 line-through">{formatHistoryValue(oldValue)}</span>
                                                                                        <ArrowUpRight className="h-2.5 w-2.5 text-gray-400" />
                                                                                        <span className="text-gray-600">{formatHistoryValue(newValue)}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <div className="text-xs text-gray-500">{actor}</div>
                                                                            <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(when)}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Brand History Pagination */}
                                        {brandHistoryTotal > 0 && (
                                            <div className="px-5 py-4 border-t" style={{ borderColor: `${colors.primary.main}10` }}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setBrandHistoryPage((p) => Math.max(1, p - 1))}
                                                        disabled={brandHistoryPage <= 1}
                                                        className="p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{ borderColor: `${colors.primary.main}20`, backgroundColor: 'white', color: colors.primary.main }}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>
                                                    <span className="text-sm text-gray-600">
                                                        Page {brandHistoryPage} of {Math.max(1, Math.ceil(brandHistoryTotal / brandHistoryLimit))}
                                                    </span>
                                                    <button
                                                        onClick={() => setBrandHistoryPage((p) => p + 1)}
                                                        disabled={brandHistoryPage >= Math.max(1, Math.ceil(brandHistoryTotal / brandHistoryLimit))}
                                                        className="p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{ borderColor: `${colors.primary.main}20`, backgroundColor: 'white', color: colors.primary.main }}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!canViewBrandsCompaniesReport && canViewBrandHistory && (
                        <div className="mt-8">
                            <div className="relative bg-white rounded-2xl shadow-lg border overflow-hidden" style={{ borderColor: `${colors.primary.main}20` }}>
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${colors.primary.main}, ${colors.primary.light})` }}></div>

                                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                                <History className="h-5 w-5" style={{ color: colors.primary.main }} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">Brand Activity Timeline</h2>
                                                <p className="text-sm text-gray-500 mt-0.5">Recent brand updates and changes</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ backgroundColor: `${colors.primary.main}10` }}>
                                            <span className="text-sm font-bold" style={{ color: colors.primary.main }}>{brandHistoryTotal}</span>
                                            <span className="text-xs text-gray-500">activities</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {brandHistoryItems.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="inline-flex p-4 rounded-full bg-gray-50 mb-3">
                                                <History className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm text-gray-500">No brand activity found.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {brandHistoryItems.map((h: any, idx: number) => {
                                                const action = String((h as any)?.action || '').toLowerCase();
                                                const actor = (h?.userName || h?.userEmail || 'Unknown').toString();
                                                const when = (h as any)?.timestamp;
                                                const field = (h as any)?.field;
                                                const oldValue = (h as any)?.oldValue;
                                                const newValue = (h as any)?.newValue;

                                                return (
                                                    <div key={`${String(h?._brandId || '')}-${idx}`} className="group relative pl-5 before:absolute before:left-0 before:top-4 before:bottom-4 before:w-px">
                                                        <div className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
                                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                <div className="mt-0.5 p-1.5 rounded-lg bg-white shadow-sm">
                                                                    {getHistoryIcon(action)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-sm font-semibold text-gray-900">
                                                                            {(h?._brandGroupNumber ? `${h._brandGroupNumber} - ` : '')}{h?._brandName || 'Brand'}
                                                                        </span>
                                                                        {h?._brandCompany && (
                                                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.primary.main}10`, color: colors.primary.main }}>
                                                                                {h._brandCompany}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        {(h?.message || '').toString() || action}
                                                                    </div>
                                                                    {field !== undefined && (oldValue !== undefined || newValue !== undefined) && (
                                                                        <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5 bg-gray-50 inline-flex px-2 py-1 rounded-lg">
                                                                            <span className="font-medium text-gray-600">{String(field)}:</span>
                                                                            <span className="text-gray-400 line-through">{formatHistoryValue(oldValue)}</span>
                                                                            <ArrowRight className="h-2.5 w-2.5 text-gray-400" />
                                                                            <span className="text-gray-600">{formatHistoryValue(newValue)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="text-right shrink-0">
                                                                <div className="text-xs font-medium text-gray-700">{actor}</div>
                                                                <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(when)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {brandHistoryTotal > brandHistoryLimit && (
                                        <div className="mt-6 flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setBrandHistoryPage((p) => Math.max(1, p - 1))}
                                                disabled={brandHistoryPage <= 1}
                                                className="p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ borderColor: `${colors.primary.main}20`, backgroundColor: 'white', color: colors.primary.main }}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <span className="text-sm text-gray-600">
                                                Page {brandHistoryPage} of {Math.max(1, Math.ceil(brandHistoryTotal / brandHistoryLimit))}
                                            </span>
                                            <button
                                                onClick={() => setBrandHistoryPage((p) => p + 1)}
                                                disabled={brandHistoryPage >= Math.max(1, Math.ceil(brandHistoryTotal / brandHistoryLimit))}
                                                className="p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ borderColor: `${colors.primary.main}20`, backgroundColor: 'white', color: colors.primary.main }}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tasks Section */}
                    {(taskDisplayType || displayedTasks.length > 0) && (
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{getTaskDisplayTitle()}</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {displayedTasks.length} tasks found
                                        {taskDisplayType === 'total-brands' && getActiveFilterCount() > 0 && ' for filtered brands'}
                                        {taskDisplayType === 'active-brands' && ' for active brands'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setTaskDisplayType(null)}
                                    className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                    Hide tasks
                                </button>
                            </div>
                            {displayedTasks.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                                    <div className="max-w-md mx-auto">
                                        <div className="p-4 bg-gray-50 rounded-2xl inline-flex mb-4">
                                            <BarChart3 className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                                            No tasks found
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {taskDisplayType === 'active-brands'
                                                ? 'No tasks found for active brands'
                                                : 'Try adjusting your filters or select a different stat card'
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {displayedTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
                                                        {task.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                                        <Building className="h-3 w-3" />
                                                        <span>{task.companyName || 'No company'}</span>
                                                        <span>•</span>
                                                        <span>{typeof task.brand === 'string' ? task.brand : (task.brand as any)?.name || 'No brand'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                                        {getTaskStatusIcon(task.status)}
                                                        <span className="ml-1">{task.status}</span>
                                                    </div>
                                                    {task.priority && (
                                                        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getTaskPriorityColor(task.priority)}`}>
                                                            {getTaskPriorityIcon(task.priority)}
                                                            <span className="ml-1">{task.priority}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarDays className="h-3 w-3" />
                                                    <span>
                                                        Due: {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    <span>
                                                        {(typeof task.assignedTo === 'string'
                                                            ? (task.assignedToName || task.assignedTo)
                                                            : (task.assignedTo?.name || task.assignedToName)
                                                        ) || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreateBrandModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateBrand}
                companies={companies}
            />

            <BulkBrandAddModal
                isOpen={showBulkAddModal}
                onClose={() => setShowBulkAddModal(false)}
                onBulkAdd={handleBulkAddBrands}
                companies={companies}
            />

            <EditCompanyModal
                isOpen={showEditCompanyModal}
                onClose={() => {
                    setShowEditCompanyModal(false);
                    setSelectedCompany(null);
                }}
                onUpdate={handleUpdateCompany}
                company={selectedCompany}
            />

            {selectedBrand && (
                <EditBrandModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedBrand(null);
                    }}
                    onUpdate={handleUpdateBrand}
                    brand={selectedBrand}
                />
            )}
        </div>
    );
};

export default BrandsListPage;