import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

import type { Brand, Company, UserType } from '../Types/Types';
import type { TaskTypeItem } from '../Services/TaskType.service';

import { companyService } from '../Services/Company.service';
import { brandService } from '../Services/Brand.service';
import { taskTypeService } from '../Services/TaskType.service';
import { companyBrandTaskTypeService } from '../Services/CompanyBrandTaskType.service';
import { assignService, type AssignUserItem } from '../Services/Assign.service';
import { authService } from '../Services/User.Services';

import BulkAddCompaniesModal from './DashboardModals/BulkAddCompaniesModal';
import BulkAddBrandsModal from './DashboardModals/BulkAddBrandsModal';
import BulkAddTaskTypesModal from './DashboardModals/BulkAddTaskTypesModal';
import ManagerAddBrandModal from './DashboardModals/ManagerAddBrandModal';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type Props = {
    currentUser: UserType;
};

const normalizeText = (v: unknown) => (v == null ? '' : String(v)).trim();
const normalizeCompanyKey = (v: unknown) => normalizeText(v).toLowerCase().replace(/\s+/g, '');

const SPEED_E_COM_COMPANY_KEY = 'speedecom';

const AssignPage = ({ currentUser }: Props) => {
    const hasAccess = useCallback((moduleId: string) => {
        const perms = (currentUser as any)?.permissions;
        if (!perms || typeof perms !== 'object') return true;
        if (Object.keys(perms).length === 0) return true;
        if (typeof (perms as any)[moduleId] === 'undefined') return true;
        const perm = String((perms as any)[moduleId] || '').toLowerCase();
        return perm !== 'deny';
    }, [currentUser]);

    const accessPermission = ((currentUser as any)?.permissions?.assign_page || 'deny').toString().toLowerCase();
    const canOpen = accessPermission !== 'deny';

    const canBulkAddCompanies = useMemo(() => hasAccess('company_bulk_add'), [hasAccess]);
    const canBulkAddBrands = useMemo(() => hasAccess('brand_bulk_add'), [hasAccess]);
    const canCreateBrand = useMemo(() => hasAccess('brand_create'), [hasAccess]);
    const canBulkAddTaskTypes = useMemo(() => hasAccess('task_type_bulk_add'), [hasAccess]);

    const isSbmRole = useMemo(() => {
        const r = String((currentUser as any)?.role || '').trim().toLowerCase();
        return r === 'sbm';
    }, [currentUser]);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
    const [companyAllowedTaskTypeIds, setCompanyAllowedTaskTypeIds] = useState<Set<string>>(new Set());

    const isAdminUser = useMemo(() => {
        const r = String((currentUser as any)?.role || '').toLowerCase();
        return r === 'admin' || r === 'super_admin';
    }, [currentUser]);

    const canUseBulkBrandGroupFields = useMemo(() => {
        const r = String((currentUser as any)?.role || '').toLowerCase();
        return r === 'admin' || r === 'super_admin' || r === 'abm' || r === 'sbm';
    }, [currentUser]);

    const [mdManagers, setMdManagers] = useState<UserType[]>([]);
    const [selectedMdManagerId, setSelectedMdManagerId] = useState<string>('');
    const [mdManagerCompanyIds, setMdManagerCompanyIds] = useState<Set<string>>(new Set());
    const [isSavingMdManagerCompanies, setIsSavingMdManagerCompanies] = useState(false);

    const [obManagers, setObManagers] = useState<UserType[]>([]);
    const [selectedObManagerId, setSelectedObManagerId] = useState<string>('');
    const [obManagerCompanyIds, setObManagerCompanyIds] = useState<Set<string>>(new Set());
    const [isSavingObManagerCompanies, setIsSavingObManagerCompanies] = useState(false);

    const [sbmUsers, setSbmUsers] = useState<UserType[]>([]);
    const [selectedSbmId, setSelectedSbmId] = useState<string>('');
    const [sbmCompanyIds, setSbmCompanyIds] = useState<Set<string>>(new Set());
    const [isSavingSbmCompanies, setIsSavingSbmCompanies] = useState(false);

    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [companyUsers, setCompanyUsers] = useState<AssignUserItem[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const isSpeedEcomCompanySelected = useMemo(() => {
        return normalizeCompanyKey(selectedCompany) === SPEED_E_COM_COMPANY_KEY;
    }, [selectedCompany]);

    const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(new Set());
    const [pendingTaskTypeIds, setPendingTaskTypeIds] = useState<Set<string>>(new Set());
    const [initialAssignedBrandIds, setInitialAssignedBrandIds] = useState<Set<string>>(new Set());

    const [brandSearch, setBrandSearch] = useState('');

    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingBrands, setLoadingBrands] = useState(false);
    const [loadingTaskTypes, setLoadingTaskTypes] = useState(false);
    const [loadingMappings, setLoadingMappings] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const applyInFlightRef = useRef(false);

    const [showBulkCompanyModal, setShowBulkCompanyModal] = useState(false);
    const [bulkCompanyNames, setBulkCompanyNames] = useState('');
    const [isCreatingBulkCompanies, setIsCreatingBulkCompanies] = useState(false);

    const [showBulkBrandModal, setShowBulkBrandModal] = useState(false);
    const [bulkBrandForm, setBulkBrandForm] = useState<{
        company: string;
        brandNames: string;
        groupNumber?: string;
        groupName?: string;
        rmEmail?: string;
        amEmail?: string;
    }>({ company: '', brandNames: '' });
    const [isCreatingBulkBrands, setIsCreatingBulkBrands] = useState(false);

    const [showBulkTaskTypeModal, setShowBulkTaskTypeModal] = useState(false);
    const [bulkTaskTypeCompany, setBulkTaskTypeCompany] = useState('');
    const [bulkTaskTypeNames, setBulkTaskTypeNames] = useState('');
    const [isCreatingBulkTaskTypes, setIsCreatingBulkTaskTypes] = useState(false);

    const [showManagerAddBrandModal, setShowManagerAddBrandModal] = useState(false);
    const [managerBrandName, setManagerBrandName] = useState('');
    const [isCreatingManagerBrand, setIsCreatingManagerBrand] = useState(false);

    const companyOptions = useMemo(() => {
        const list = (companies || [])
            .map((c: any) => String(c?.name || '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        if (!isSbmRole) return list;

        const onlyRaw = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();
        const onlyKey = normalizeCompanyKey(onlyRaw);
        const match = list.find((c) => normalizeCompanyKey(c) === onlyKey);
        if (match) return [match];
        if (onlyRaw) return [onlyRaw];
        return list.slice(0, 1);
    }, [companies, currentUser, isSbmRole]);

    const loadCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const role = String((currentUser as any)?.role || '').toLowerCase();
            const needsAllowedCompanies = role === 'md_manager' || role === 'ob_manager' || role === 'manager' || role === 'assistant';
            const res = needsAllowedCompanies ? await companyService.getAllowedCompanies() : await companyService.getCompanies();
            if (res?.success && Array.isArray(res.data)) {
                setCompanies(res.data);
            } else {
                setCompanies([]);
            }
        } catch (e: any) {
            setCompanies([]);
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load companies');
        } finally {
            setLoadingCompanies(false);
        }
    }, [isAdminUser]);

    const loadMdManagers = useCallback(async () => {
        if (!isAdminUser) return;

        try {
            const res = await authService.getAllUsers();
            const users = Array.isArray(res?.data) ? res.data : [];
            const list = users
                .filter((u: any) => String(u?.role || '').toLowerCase() === 'md_manager')
                .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
            setMdManagers(list);
        } catch {
            setMdManagers([]);
        }
    }, [isAdminUser]);

    const loadObManagers = useCallback(async () => {
        if (!isAdminUser) return;

        try {
            const res = await authService.getAllUsers();
            const users = Array.isArray((res as any)?.data) ? (res as any).data : [];
            const list = users
                .filter((u: any) => String(u?.role || '').toLowerCase() === 'ob_manager')
                .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
            setObManagers(list);
        } catch {
            setObManagers([]);
        }
    }, [isAdminUser]);

    const loadSbms = useCallback(async () => {
        if (!isAdminUser) return;

        try {
            const res = await authService.getAllUsers();
            const users = Array.isArray((res as any)?.data) ? (res as any).data : [];
            const list = users
                .filter((u: any) => String(u?.role || '').toLowerCase() === 'sbm')
                .sort((a: any, b: any) => String(a?.name || a?.email || '').localeCompare(String(b?.name || b?.email || '')));
            setSbmUsers(list);
        } catch {
            setSbmUsers([]);
        }
    }, [isAdminUser]);

    const loadTaskTypes = useCallback(async () => {
        setLoadingTaskTypes(true);
        try {
            const res = await taskTypeService.getTaskTypes();
            if (res?.success && Array.isArray(res.data)) {
                setTaskTypes(res.data);
            } else {
                setTaskTypes([]);
            }
        } catch (e: any) {
            setTaskTypes([]);
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load task types');
        } finally {
            setLoadingTaskTypes(false);
        }
    }, []);

    const loadCompanyAllowedTaskTypes = useCallback(async (companyName: string) => {
        const company = normalizeText(companyName);
        if (!company) {
            setCompanyAllowedTaskTypeIds(new Set());
            return;
        }

        if (isAdminUser || normalizeCompanyKey(company) === SPEED_E_COM_COMPANY_KEY) {
            try {
                const res = await taskTypeService.getTaskTypes({ companyName: company });
                const ids = (res?.data || [])
                    .map((t: any) => String(t?.id || t?._id || '').trim())
                    .filter(Boolean);
                setCompanyAllowedTaskTypeIds(new Set(ids));
            } catch {
                setCompanyAllowedTaskTypeIds(new Set());
            }
            return;
        }

        try {
            const res = await companyBrandTaskTypeService.getCompanyTaskTypes({ companyName: company });
            const ids = (res?.data?.taskTypes || [])
                .map((t: any) => String(t?.id || t?._id || '').trim())
                .filter(Boolean);
            setCompanyAllowedTaskTypeIds(new Set(ids));
        } catch {
            setCompanyAllowedTaskTypeIds(new Set());
        }
    }, []);

    const loadBrandsForCompany = useCallback(async (companyName: string) => {
        const company = normalizeText(companyName);
        if (!company) {
            setBrands([]);
            return;
        }

        setLoadingBrands(true);
        try {
            const res = await brandService.getBrands({ company, includeDeleted: true });
            if (res?.success && Array.isArray(res.data)) {
                setBrands(res.data);
            } else {
                setBrands([]);
            }
        } catch (e: any) {
            setBrands([]);
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load brands');
        } finally {
            setLoadingBrands(false);
        }
    }, []);

    const loadUsersForCompany = useCallback(async (companyName: string) => {
        const company = normalizeText(companyName);
        if (!company) {
            setCompanyUsers([]);
            return;
        }

        setLoadingUsers(true);
        try {
            const res = await assignService.getCompanyUsers({ companyName: company });
            if (res?.success && Array.isArray(res.data)) {
                setCompanyUsers(res.data);
            } else {
                setCompanyUsers([]);
            }
        } catch (e: any) {
            setCompanyUsers([]);
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const loadMappings = useCallback(async (companyName: string, userId: string) => {
        const company = normalizeText(companyName);
        const uid = normalizeText(userId);
        if (!company || !uid) {
            setSelectedBrandIds(new Set());
            setPendingTaskTypeIds(new Set());
            setInitialAssignedBrandIds(new Set());
            return;
        }

        setLoadingMappings(true);
        try {
            const res = await assignService.getUserMappings({ companyName: company, userId: uid });

            const nextSelectedBrands = new Set<string>();
            const nextInitialBrands = new Set<string>();
            const nextUnionTaskTypeIds = new Set<string>();

            (res?.data || []).forEach((m: any) => {
                const brandId = String(m?.brandId || '').trim();
                const ids = Array.isArray(m?.taskTypeIds) ? m.taskTypeIds.map((x: any) => String(x).trim()).filter(Boolean) : [];
                if (!brandId) return;
                if (ids.length === 0) return;
                nextSelectedBrands.add(brandId);
                nextInitialBrands.add(brandId);
                ids.forEach((id: string) => nextUnionTaskTypeIds.add(id));
            });

            setSelectedBrandIds(nextSelectedBrands);
            setInitialAssignedBrandIds(nextInitialBrands);
            setPendingTaskTypeIds(nextUnionTaskTypeIds);
        } catch (e: any) {
            setSelectedBrandIds(new Set());
            setPendingTaskTypeIds(new Set());
            setInitialAssignedBrandIds(new Set());
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load assignments');
        } finally {
            setLoadingMappings(false);
        }
    }, []);

    useEffect(() => {
        if (!canOpen) return;
        void loadCompanies();
        void loadTaskTypes();
    }, [canOpen, loadCompanies, loadTaskTypes]);

    useEffect(() => {
        if (!canOpen) return;
        if (!isSbmRole) return;
        if (!selectedCompany && (companyOptions || []).length === 1) {
            const only = String(companyOptions[0] || '').trim();
            if (!only) return;
            setSelectedCompany(only);
            setBulkBrandForm((prev) => ({ ...prev, company: only }));
            setBulkTaskTypeCompany(only);
        }
    }, [canOpen, companyOptions, isSbmRole, selectedCompany]);

    useEffect(() => {
        if (!canOpen) return;
        if (!isAdminUser) return;
        void loadMdManagers();
        void loadObManagers();
        void loadSbms();
    }, [canOpen, isAdminUser, loadMdManagers, loadObManagers, loadSbms]);

    useEffect(() => {
        if (!isAdminUser) return;
        const uid = normalizeText(selectedMdManagerId);
        if (!uid) {
            setMdManagerCompanyIds(new Set());
            return;
        }

        const user: any = (mdManagers || []).find((u: any) => String(u?.id || u?._id || '').toString() === uid);
        const ids = Array.isArray(user?.assignedCompanyIds)
            ? user.assignedCompanyIds.map((x: any) => String(x).trim()).filter(Boolean)
            : [];
        setMdManagerCompanyIds(new Set(ids));
    }, [isAdminUser, mdManagers, selectedMdManagerId]);

    useEffect(() => {
        if (!isAdminUser) return;
        const uid = normalizeText(selectedObManagerId);
        if (!uid) {
            setObManagerCompanyIds(new Set());
            return;
        }

        const user: any = (obManagers || []).find((u: any) => String(u?.id || u?._id || '').toString() === uid);
        const ids = Array.isArray(user?.assignedCompanyIds)
            ? user.assignedCompanyIds.map((x: any) => String(x).trim()).filter(Boolean)
            : [];
        setObManagerCompanyIds(new Set(ids));
    }, [isAdminUser, obManagers, selectedObManagerId]);

    useEffect(() => {
        if (!isAdminUser) return;
        const uid = normalizeText(selectedSbmId);
        if (!uid) {
            setSbmCompanyIds(new Set());
            return;
        }

        const user: any = (sbmUsers || []).find((u: any) => String(u?.id || u?._id || '').toString() === uid);
        const ids = Array.isArray(user?.assignedCompanyIds)
            ? user.assignedCompanyIds.map((x: any) => String(x).trim()).filter(Boolean)
            : [];
        setSbmCompanyIds(new Set(ids));
    }, [isAdminUser, sbmUsers, selectedSbmId]);

    useEffect(() => {
        if (!canOpen) return;
        setSelectedUserId('');
        setCompanyUsers([]);
        setSelectedBrandIds(new Set());
        setPendingTaskTypeIds(new Set());
        setInitialAssignedBrandIds(new Set());
        void loadUsersForCompany(selectedCompany);
        void loadBrandsForCompany(selectedCompany);
        void loadCompanyAllowedTaskTypes(selectedCompany);

        if (selectedCompany) {
            setBulkBrandForm((prev) => ({ ...prev, company: selectedCompany }));
            setBulkTaskTypeCompany(selectedCompany);
        }
    }, [canOpen, loadBrandsForCompany, loadCompanyAllowedTaskTypes, loadUsersForCompany, selectedCompany]);

    useEffect(() => {
        if (!canOpen) return;

        if (isAdminUser || isSpeedEcomCompanySelected) return;

        setPendingTaskTypeIds((prev) => {
            if (companyAllowedTaskTypeIds.size === 0) return prev;
            const next = new Set<string>();
            prev.forEach((id) => {
                if (companyAllowedTaskTypeIds.has(id)) next.add(id);
            });
            return next;
        });
    }, [canOpen, companyAllowedTaskTypeIds, isAdminUser, isSpeedEcomCompanySelected]);

    useEffect(() => {
        if (!canOpen) return;
        void loadMappings(selectedCompany, selectedUserId);
    }, [canOpen, loadMappings, selectedCompany, selectedUserId]);

    useEffect(() => {
        const handler = () => {
            if (!selectedCompany) return;
            void loadCompanies();
            void loadBrandsForCompany(selectedCompany);
            void loadTaskTypes();
        };
        window.addEventListener('brandUpdated', handler as any);
        return () => window.removeEventListener('brandUpdated', handler as any);
    }, [loadBrandsForCompany, loadCompanies, loadTaskTypes, selectedCompany]);

    useEffect(() => {
        const handler = (evt: any) => {
            if (!selectedCompany) return;

            const detail = evt?.detail || {};
            const companyName = normalizeText(detail?.companyName);
            const userId = normalizeText(detail?.userId);

            if (companyName && normalizeText(selectedCompany) !== companyName) return;

            void loadUsersForCompany(selectedCompany);

            if (userId && normalizeText(selectedUserId) && userId !== normalizeText(selectedUserId)) {
                return;
            }

            void loadMappings(selectedCompany, selectedUserId);
        };

        window.addEventListener('assignmentsApplied', handler as any);
        return () => window.removeEventListener('assignmentsApplied', handler as any);
    }, [loadMappings, loadUsersForCompany, selectedCompany, selectedUserId]);

    useEffect(() => {
        if (!showBulkBrandModal) return;
        const company = normalizeText(bulkBrandForm.company);
        if (!company) return;
        void loadUsersForCompany(company);
    }, [bulkBrandForm.company, loadUsersForCompany, showBulkBrandModal]);

    const selectedUser = useMemo(() => {
        const uid = normalizeText(selectedUserId);
        return (companyUsers || []).find((u) => String(u.id || '').trim() === uid) || null;
    }, [companyUsers, selectedUserId]);

    const toggleMdManagerCompany = useCallback((companyId: string) => {
        const id = normalizeText(companyId);
        if (!id) return;
        setMdManagerCompanyIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const resolveErrorMessage = useCallback((e: any, fallback: string) => {
        const msg = String(e?.response?.data?.message || e?.message || '').trim();
        const code = String(e?.code || '').trim();
        const isTimeout = code === 'ECONNABORTED' || /timeout/i.test(msg);
        if (isTimeout) return fallback;
        return msg || fallback;
    }, []);

    const toggleSbmCompany = useCallback((companyId: string) => {
        const id = normalizeText(companyId);
        if (!id) return;
        setSbmCompanyIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleObManagerCompany = useCallback((companyId: string) => {
        const id = normalizeText(companyId);
        if (!id) return;
        setObManagerCompanyIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleSaveMdManagerCompanies = useCallback(async () => {
        if (!isAdminUser) {
            toast.error('Access denied');
            return;
        }

        const mdManagerId = normalizeText(selectedMdManagerId);
        if (!mdManagerId) {
            toast.error('Please select an MD Manager');
            return;
        }

        setIsSavingMdManagerCompanies(true);
        try {
            const companyIds = Array.from(mdManagerCompanyIds);
            const res = await assignService.assignCompaniesToMdManager({ mdManagerId, companyIds });
            if (res?.success) {
                toast.success(res?.message || 'Companies assigned');
                await loadMdManagers();
            } else {
                toast.error(res?.message || 'Failed to assign companies');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to assign companies');
        } finally {
            setIsSavingMdManagerCompanies(false);
        }
    }, [isAdminUser, loadMdManagers, mdManagerCompanyIds, selectedMdManagerId]);

    const handleSaveObManagerCompanies = useCallback(async () => {
        if (!isAdminUser) {
            toast.error('Access denied');
            return;
        }

        const obManagerId = normalizeText(selectedObManagerId);
        if (!obManagerId) {
            toast.error('Please select an OB Manager');
            return;
        }

        setIsSavingObManagerCompanies(true);
        try {
            const companyIds = Array.from(obManagerCompanyIds);
            const res = await assignService.assignCompaniesToObManager({ obManagerId, companyIds });
            if (res?.success) {
                toast.success(res?.message || 'Companies assigned');
                await loadObManagers();
            } else {
                toast.error(res?.message || 'Failed to assign companies');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to assign companies');
        } finally {
            setIsSavingObManagerCompanies(false);
        }
    }, [isAdminUser, loadObManagers, obManagerCompanyIds, selectedObManagerId]);

    const handleSaveSbmCompanies = useCallback(async () => {
        if (!isAdminUser) {
            toast.error('Access denied');
            return;
        }

        const sbmId = normalizeText(selectedSbmId);
        if (!sbmId) {
            toast.error('Please select an SBM');
            return;
        }

        setIsSavingSbmCompanies(true);
        try {
            const companyIds = Array.from(sbmCompanyIds);
            const res = await assignService.assignCompaniesToSbm({ sbmId, companyIds });
            if (res?.success) {
                toast.success(res?.message || 'Companies assigned');
                await loadSbms();
            } else {
                toast.error(res?.message || 'Failed to assign companies');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to assign companies');
        } finally {
            setIsSavingSbmCompanies(false);
        }
    }, [isAdminUser, loadSbms, sbmCompanyIds, selectedSbmId]);

    const brandOptions = useMemo(() => {
        const raw = (brands || [])
            .map((b: any) => {
                const id = String(b?._id || b?.id || '').trim();
                const name = String(b?.name || '').trim();
                const groupNumber = String((b as any)?.groupNumber || '').trim();
                const label = groupNumber ? `${groupNumber} - ${name}` : name;
                return { id, name: label };
            })
            .filter((b) => Boolean(b.id) && Boolean(b.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (!selectedUserId) return raw;

        if (loadingMappings) return raw;

        const allowed = initialAssignedBrandIds;
        return raw.filter((b) => allowed.has(b.id));
    }, [brands, initialAssignedBrandIds, loadingMappings, selectedUserId]);

    const filteredBrandOptions = useMemo(() => {
        const q = normalizeText(brandSearch).toLowerCase();
        if (!q) return brandOptions;
        return brandOptions.filter((b) => String(b?.name || '').toLowerCase().includes(q));
    }, [brandOptions, brandSearch]);

    const taskTypeOptions = useMemo(() => {
        const allowed = companyAllowedTaskTypeIds;
        return (taskTypes || [])
            .map((t: any) => ({
                id: String(t?.id || t?._id || '').trim(),
                name: normalizeText(t?.name),
            }))
            .filter((t) => Boolean(t.id) && Boolean(t.name))
            .filter((t) => allowed.size === 0 || allowed.has(t.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [companyAllowedTaskTypeIds, taskTypes]);

    const taskTypeNameById = useMemo(() => {
        const map = new Map<string, string>();
        (taskTypes || []).forEach((t: any) => {
            const id = String(t?.id || t?._id || '').trim();
            const name = String(t?.name || '').trim();
            if (id && name && !map.has(id)) map.set(id, name);
        });
        return map;
    }, [taskTypes]);

    const toggleBrand = useCallback((brandId: string) => {
        const id = normalizeText(brandId);
        if (!id) return;

        setSelectedBrandIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleTaskType = useCallback((taskTypeId: string) => {
        const id = normalizeText(taskTypeId);
        if (!id) return;

        setPendingTaskTypeIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleApply = useCallback(async () => {
        const company = normalizeText(selectedCompany);
        const uid = normalizeText(selectedUserId);
        if (!company || !uid) {
            toast.error('Please select a company and user first');
            return;
        }

        if (applyInFlightRef.current) return;

        const toAssign = Array.from(selectedBrandIds);
        const toRemove = Array.from(initialAssignedBrandIds).filter((b) => !selectedBrandIds.has(b));
        if (toAssign.length === 0 && toRemove.length === 0) {
            toast.error('Please select at least one brand');
            return;
        }

        const selectedTaskIds = Array.from(pendingTaskTypeIds);

        if (toAssign.length > 0 && selectedTaskIds.length === 0) {
            toast.error('Please select at least one task type to assign');
            return;
        }

        applyInFlightRef.current = true;
        setIsApplying(true);
        try {
            const mappings = [
                ...toAssign.map((brandId) => {
                    const brand = (brands || []).find((bb: any) => String(bb?._id || bb?.id || '').trim() === brandId);
                    const brandName = String((brand as any)?.name || '').trim();
                    return { brandId, brandName, taskTypeIds: selectedTaskIds };
                }),
                ...toRemove.map((brandId) => {
                    const brand = (brands || []).find((bb: any) => String(bb?._id || bb?.id || '').trim() === brandId);
                    const brandName = String((brand as any)?.name || '').trim();
                    return { brandId, brandName, taskTypeIds: [] as string[] };
                })
            ];

            await assignService.bulkUpsertUserMappings(
                {
                    companyName: company,
                    userId: uid,
                    mappings,
                },
                { timeout: 300000 }
            );

            toast.success('Applied');
            await loadMappings(company, uid);

            try {
                const event = new CustomEvent('assignmentsApplied', {
                    detail: {
                        companyName: company,
                        userId: uid,
                        brandIds: Array.from(selectedBrandIds),
                        taskTypeIds: Array.from(pendingTaskTypeIds)
                    }
                });
                window.dispatchEvent(event);
            } catch {
                // ignore
            }
        } catch (e: any) {
            toast.error(resolveErrorMessage(e, 'Request timed out. Please try again.'));
        } finally {
            setIsApplying(false);
            applyInFlightRef.current = false;
        }
    }, [brands, initialAssignedBrandIds, loadMappings, pendingTaskTypeIds, resolveErrorMessage, selectedBrandIds, selectedCompany, selectedUserId]);

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
            if (res?.success && res.data) {
                await loadCompanies();
                setSelectedCompany(String(res.data.name || '').trim());
            }
        } catch {
            toast.error('Failed to create company');
        }
    }, [canBulkAddCompanies, loadCompanies]);

    const handleAddBrandClick = useCallback(async () => {
        if (canBulkAddBrands) {
            setShowBulkBrandModal(true);
            return;
        }

        if (!selectedCompany) {
            toast.error('Please select a company first');
            return;
        }

        if (!canCreateBrand) {
            toast.error('Access denied');
            return;
        }

        setManagerBrandName('');
        setShowManagerAddBrandModal(true);
    }, [canBulkAddBrands, canCreateBrand, selectedCompany]);

    const handleAddTaskTypeClick = useCallback(async () => {
        if (canBulkAddTaskTypes) {
            if (!bulkTaskTypeCompany) setBulkTaskTypeCompany(selectedCompany || '');
            setShowBulkTaskTypeModal(true);
            return;
        }

        const raw = window.prompt('Enter task type');
        const name = (raw || '').toString().trim();
        if (!name) return;

        try {
            await taskTypeService.createTaskType({ name, companyName: selectedCompany || bulkTaskTypeCompany });
            await loadTaskTypes();
        } catch {
            toast.error('Failed to create task type');
        }
    }, [bulkTaskTypeCompany, canBulkAddTaskTypes, loadTaskTypes, selectedCompany]);

    const handleSubmitBulkCompanies = useCallback(async () => {
        if (!canBulkAddCompanies) {
            toast.error('Access denied');
            return;
        }

        const names = (bulkCompanyNames || '').trim();
        if (!names) {
            toast.error('Please enter company names');
            return;
        }

        const items = names
            .split(/\r?\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);

        if (items.length === 0) {
            toast.error('No valid company names provided');
            return;
        }

        setIsCreatingBulkCompanies(true);
        try {
            const res = await companyService.bulkUpsertCompanies({ companies: items });
            if (res?.success) {
                setShowBulkCompanyModal(false);
                setBulkCompanyNames('');
                await loadCompanies();
                toast.success('Companies added');
            } else {
                toast.error('Failed to add companies');
            }
        } catch {
            toast.error('Failed to add companies');
        } finally {
            setIsCreatingBulkCompanies(false);
        }
    }, [bulkCompanyNames, canBulkAddCompanies, loadCompanies]);

    const handleSubmitBulkBrands = useCallback(async () => {
        if (!canBulkAddBrands) {
            toast.error('Access denied');
            return;
        }

        if (!bulkBrandForm.company) {
            toast.error('Please select a company');
            return;
        }

        const companyKey = normalizeCompanyKey(bulkBrandForm.company);
        const isSpeedEcomCompany = companyKey === 'speedecom';
        const isSpeedEcomBulkMode = Boolean(canUseBulkBrandGroupFields && isSpeedEcomCompany);

        if (isSpeedEcomBulkMode) {
            const rmEmail = normalizeText(bulkBrandForm.rmEmail);
            if (!rmEmail) {
                toast.error('Please select RM');
                return;
            }
        }

        const splitLines = (text: string) => (text || '').split(/\r?\n/).map((l) => l.trim());
        const trimEndEmpty = (list: string[]) => {
            let end = list.length;
            while (end > 0 && !list[end - 1]) end -= 1;
            return list.slice(0, end);
        };

        const requestedBrands = isSpeedEcomBulkMode
            ? (() => {
                const groupNumbers = trimEndEmpty(splitLines(bulkBrandForm.groupNumber || ''));
                const brandNames = trimEndEmpty(splitLines(bulkBrandForm.groupName || ''));

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

        const existingBrands = Array.isArray(brands) ? brands : [];
        if (existingBrands.length > 0) {
            const company = (bulkBrandForm.company || '').toString().trim();
            const companyKeyForCompare = normalizeCompanyKey(company);
            const duplicateMessages: string[] = [];

            requestedBrands.forEach((row, index) => {
                const brandName = (row.brandName || '').toString().trim();
                const groupNumber = (row.groupNumber || '').toString().trim();
                const nameKey = normalizeText(brandName).toLowerCase();
                const groupKey = normalizeText(groupNumber).toLowerCase();

                if (!nameKey && !groupKey) return;

                const match = existingBrands.find((b: any) => {
                    const bCompanyKey = normalizeCompanyKey((b?.company || b?.companyName || '') as string);
                    if (bCompanyKey !== companyKeyForCompare) return false;

                    const bNameKey = normalizeText((b?.name || b?.brandName || b?.brand || '') as string).toLowerCase();
                    const bGroupKey = normalizeText((b?.groupNumber || '') as string).toLowerCase();

                    const nameMatches = nameKey && bNameKey === nameKey;
                    const groupMatches = groupKey && bGroupKey === groupKey;
                    if (isSpeedEcomBulkMode) {
                        return groupMatches;
                    }
                    return nameMatches;
                });

                if (match) {
                    const label = groupNumber ? `${groupNumber} - ${brandName}` : brandName || '(Unnamed Brand)';
                    duplicateMessages.push(`Row ${index + 1}: ${label} already exists for ${company}`);
                }
            });

            if (duplicateMessages.length > 0) {
                const message = `${duplicateMessages.join('\n')}\n\nDo you still want to proceed and upsert these brands?`;
                const confirmed = window.confirm(message);
                if (!confirmed) {
                    return;
                }
            }
        }

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
                company: bulkBrandForm.company,
                status: 'active',
                ...(isSpeedEcomBulkMode
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

            if (res?.success) {
                if (isSpeedEcomBulkMode && (bulkBrandForm.rmEmail || bulkBrandForm.amEmail)) {
                    const backendDidAssignment = Boolean((res as any)?.meta?.assignment?.mappingOps);
                    if (backendDidAssignment) {
                        toast.success('Assigned to selected RM/AM');
                    } else {
                        toast.success('Brands added. Assignment is processing on server.');
                    }
                }

                setShowBulkBrandModal(false);
                setBulkBrandForm((prev) => ({
                    ...prev,
                    brandNames: '',
                    groupNumber: '',
                    groupName: '',
                    rmEmail: '',
                    amEmail: ''
                }));
                toast.success('Brands added');
                void loadBrandsForCompany(selectedCompany);
                try {
                    const event = new CustomEvent('brandUpdated', { detail: { brands: res.data } });
                    window.dispatchEvent(event);
                } catch {
                    // ignore
                }
            } else {
                toast.error('Failed to add brands');
            }
        } catch (e: any) {
            toast.error(resolveErrorMessage(e, 'Request timed out. Please try again.'));
        } finally {
            setIsCreatingBulkBrands(false);
        }
    }, [brands, bulkBrandForm.amEmail, bulkBrandForm.brandNames, bulkBrandForm.company, bulkBrandForm.groupName, bulkBrandForm.groupNumber, bulkBrandForm.rmEmail, canBulkAddBrands, canUseBulkBrandGroupFields, companyAllowedTaskTypeIds, companyUsers, loadBrandsForCompany, normalizeCompanyKey, resolveErrorMessage, selectedCompany]);

    const handleSubmitBulkTaskTypes = useCallback(async () => {
        if (!canBulkAddTaskTypes) {
            toast.error('Access denied');
            return;
        }

        const names = (bulkTaskTypeNames || '').trim();
        if (!names) {
            toast.error('Please enter task types');
            return;
        }

        const items = names
            .split(/\r?\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);

        if (items.length === 0) {
            toast.error('No valid task types provided');
            return;
        }

        setIsCreatingBulkTaskTypes(true);
        try {
            const res = await taskTypeService.bulkUpsertTaskTypes({
                types: items.map((name) => ({ name })),
                companyName: bulkTaskTypeCompany || selectedCompany
            });

            if (res?.success) {
                setShowBulkTaskTypeModal(false);
                setBulkTaskTypeNames('');
                await loadTaskTypes();
                toast.success('Task types added');
            } else {
                toast.error('Failed to add task types');
            }
        } catch {
            toast.error('Failed to add task types');
        } finally {
            setIsCreatingBulkTaskTypes(false);
        }
    }, [bulkTaskTypeNames, canBulkAddTaskTypes, loadTaskTypes]);

    const handleManagerCreateBrand = useCallback(async () => {
        if (!selectedCompany) {
            toast.error('Please select a company first');
            return;
        }

        const name = (managerBrandName || '').toString().trim();
        if (!name) {
            toast.error('Please enter brand name');
            return;
        }

        const company = (selectedCompany || '').toString().trim();
        const companyKeyForCompare = normalizeCompanyKey(company);
        const normalizedName = normalizeText(name).toLowerCase();

        const existingBrands = Array.isArray(brands) ? brands : [];
        const hasDuplicate = existingBrands.some((b: any) => {
            const bCompanyKey = normalizeCompanyKey((b?.company || b?.companyName || '') as string);
            if (bCompanyKey !== companyKeyForCompare) return false;

            const bNameKey = normalizeText((b?.name || b?.brandName || b?.brand || '') as string).toLowerCase();
            return bNameKey === normalizedName;
        });

        if (hasDuplicate) {
            const confirmed = window.confirm(`Brand "${name}" already exists for company "${company}". Do you still want to use it?`);
            if (!confirmed) {
                return;
            }
        }

        setIsCreatingManagerBrand(true);
        try {
            const res = await brandService.createBrand({ name, company: selectedCompany, status: 'active' });
            if (res?.success && res.data) {
                setShowManagerAddBrandModal(false);
                setManagerBrandName('');
                toast.success('Brand added');
                await loadBrandsForCompany(selectedCompany);
                try {
                    const event = new CustomEvent('brandUpdated', { detail: { brands: [res.data] } });
                    window.dispatchEvent(event);
                } catch {
                    // ignore
                }
            } else {
                toast.error('Failed to create brand');
            }
        } catch (e: any) {
            toast.error(resolveErrorMessage(e, 'Request timed out. Please try again.'));
        } finally {
            setIsCreatingManagerBrand(false);
        }
    }, [brands, loadBrandsForCompany, managerBrandName, normalizeCompanyKey, resolveErrorMessage, selectedCompany]);

    if (!canOpen) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm`}>
                <div className="text-sm font-semibold text-gray-900">Access denied</div>
                <div className="mt-1 text-xs text-gray-600">You do not have permission to view this page.</div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50 p-3 md:p-4">
            <div className="w-full max-w-7xl mx-auto space-y-4">
                {/* Header - Compact */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg shadow-sm`}>
                            <Building className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Assign Page</h1>
                            <p className="text-[10px] text-gray-500 mt-0.5">Assign company brands and task types person-wise</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {!isSbmRole && (
                            <button
                                type="button"
                                onClick={handleAddCompanyClick}
                                className={`inline-flex items-center px-2.5 py-1.5 bg-blue-600 text-white text-[11px] font-medium rounded-lg hover:bg-blue-700 transition-colors`}
                            >
                                <Building className="h-3 w-3 mr-1" />
                                Company
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleAddBrandClick}
                            className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <Tag className="h-3 w-3 mr-1" />
                            Brand
                        </button>

                        <button
                            type="button"
                            onClick={handleAddTaskTypeClick}
                            className={`inline-flex items-center px-2.5 py-1.5 bg-[${theme.primary}] text-white text-[11px] font-medium rounded-lg hover:bg-[${theme.primaryDark}] transition-colors`}
                        >
                            <Tag className="h-3 w-3 mr-1" />
                            Task Type
                        </button>
                    </div>
                </div>

                {/* Company Assignment Sections - Compact */}
                {isAdminUser && (
                    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                        <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                            <div className="text-xs font-semibold text-gray-900">Company Assign (MD Manager)</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Admin assigns which companies will appear in MD Manager dropdown</div>
                        </div>
                        <div className="p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-5">
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">MD Manager</label>
                                    <select
                                        value={selectedMdManagerId}
                                        onChange={(e) => setSelectedMdManagerId(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select MD Manager</option>
                                        {mdManagers.map((u: any) => {
                                            const id = String(u?.id || u?._id || '').trim();
                                            const name = String(u?.name || u?.email || '').trim();
                                            const email = String(u?.email || '').trim();
                                            if (!id) return null;
                                            return (
                                                <option key={id} value={id}>
                                                    {name}{email ? ` (${email})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="lg:col-span-7">
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Companies</label>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
                                        {(companies || []).map((c: any) => {
                                            const id = String(c?.id || c?._id || '').trim();
                                            const name = String(c?.name || '').trim();
                                            if (!id || !name) return null;
                                            const checked = mdManagerCompanyIds.has(id);
                                            const disabled = !selectedMdManagerId || isSavingMdManagerCompanies;
                                            return (
                                                <label
                                                    key={id}
                                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-[11px] ${checked
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleMdManagerCompany(id)}
                                                        className="h-3 w-3"
                                                    />
                                                    <span className="text-[11px] font-medium text-gray-900 truncate">{name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveMdManagerCompanies}
                                            disabled={!selectedMdManagerId || isSavingMdManagerCompanies}
                                            className={`inline-flex items-center px-3 py-1.5 bg-[${theme.primary}] text-white text-[11px] font-medium rounded-lg hover:bg-[${theme.primaryDark}] disabled:opacity-60`}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isAdminUser && (
                    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                        <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                            <div className="text-xs font-semibold text-gray-900">Company Assign (SBM)</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Admin assigns which companies will appear in SBM dropdown</div>
                        </div>
                        <div className="p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-5">
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">SBM</label>
                                    <select
                                        value={selectedSbmId}
                                        onChange={(e) => setSelectedSbmId(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select SBM</option>
                                        {sbmUsers.map((u: any) => {
                                            const id = String(u?.id || u?._id || '').trim();
                                            const name = String(u?.name || u?.email || '').trim();
                                            const email = String(u?.email || '').trim();
                                            if (!id) return null;
                                            return (
                                                <option key={id} value={id}>
                                                    {name}{email ? ` (${email})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="lg:col-span-7">
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Companies</label>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
                                        {(companies || []).map((c: any) => {
                                            const id = String(c?.id || c?._id || '').trim();
                                            const name = String(c?.name || '').trim();
                                            if (!id || !name) return null;
                                            const checked = sbmCompanyIds.has(id);
                                            const disabled = !selectedSbmId || isSavingSbmCompanies;
                                            return (
                                                <label
                                                    key={id}
                                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-[11px] ${checked
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleSbmCompany(id)}
                                                        className="h-3 w-3"
                                                    />
                                                    <span className="text-[11px] font-medium text-gray-900 truncate">{name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveSbmCompanies}
                                            disabled={!selectedSbmId || isSavingSbmCompanies}
                                            className={`inline-flex items-center px-3 py-1.5 bg-[${theme.primary}] text-white text-[11px] font-medium rounded-lg hover:bg-[${theme.primaryDark}] disabled:opacity-60`}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isAdminUser && (
                    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                        <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                            <div className="text-xs font-semibold text-gray-900">Company Assign (OB Manager)</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Admin assigns which companies will appear in OB Manager dropdown</div>
                        </div>
                        <div className="p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-5">
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">OB Manager</label>
                                    <select
                                        value={selectedObManagerId}
                                        onChange={(e) => setSelectedObManagerId(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select OB Manager</option>
                                        {obManagers.map((u: any) => {
                                            const id = String(u?.id || u?._id || '').trim();
                                            const name = String(u?.name || u?.email || '').trim();
                                            const email = String(u?.email || '').trim();
                                            if (!id) return null;
                                            return (
                                                <option key={id} value={id}>
                                                    {name}{email ? ` (${email})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="lg:col-span-7">
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Companies</label>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
                                        {(companies || []).map((c: any) => {
                                            const id = String(c?.id || c?._id || '').trim();
                                            const name = String(c?.name || '').trim();
                                            if (!id || !name) return null;
                                            const checked = obManagerCompanyIds.has(id);
                                            const disabled = !selectedObManagerId || isSavingObManagerCompanies;
                                            return (
                                                <label
                                                    key={id}
                                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-[11px] ${checked
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleObManagerCompany(id)}
                                                        className="h-3 w-3"
                                                    />
                                                    <span className="text-[11px] font-medium text-gray-900 truncate">{name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveObManagerCompanies}
                                            disabled={!selectedObManagerId || isSavingObManagerCompanies}
                                            className={`inline-flex items-center px-3 py-1.5 bg-[${theme.primary}] text-white text-[11px] font-medium rounded-lg hover:bg-[${theme.primaryDark}] disabled:opacity-60`}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Company & User Selection - Compact */}
                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                    <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                        <div className="text-xs font-semibold text-gray-900">Company & User Selection</div>
                    </div>
                    <div className="p-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Company</label>
                                <select
                                    value={selectedCompany}
                                    onChange={(e) => setSelectedCompany(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={loadingCompanies || companyOptions.length === 1}
                                >
                                    <option value="">Select company</option>
                                    {companyOptions.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">User</label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={!selectedCompany || loadingUsers}
                                >
                                    <option value="">Select user</option>
                                    {companyUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedCompany && selectedUser && (
                            <div className="mt-2 text-[10px] text-gray-600">
                                Assigning for: <span className="font-semibold text-gray-900">{selectedUser.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Brand & Task Type Assignment - Compact */}
                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                    <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-semibold text-gray-900">Brand & Task Type</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                    {selectedCompany && selectedUserId ? 'Select brands and task types, then click Apply' : 'Select a company and user to configure'}
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {(loadingBrands || loadingTaskTypes || loadingMappings) ? 'Loading…' : isApplying ? 'Applying…' : ''}
                            </div>
                        </div>
                    </div>

                    <div className="p-3">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                            {/* Brands Section */}
                            <div className="lg:col-span-5 border border-gray-200 rounded-lg p-2">
                                <div className="text-[11px] font-semibold text-gray-700 mb-1">Brand</div>

                                <div className="mb-2">
                                    <input
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                        placeholder="Search brand..."
                                        disabled={!selectedCompany || !selectedUserId || loadingMappings || isApplying}
                                        className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="space-y-1 max-h-[320px] overflow-y-auto">
                                    {filteredBrandOptions.map((b) => {
                                        const checked = selectedBrandIds.has(b.id);
                                        const disabled = !selectedCompany || !selectedUserId || loadingMappings || isApplying;
                                        return (
                                            <label
                                                key={b.id}
                                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] ${checked ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={disabled}
                                                    onChange={() => toggleBrand(b.id)}
                                                    className="h-3 w-3"
                                                />
                                                <span className="text-[11px] text-gray-700 truncate">{b.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Task Types Section */}
                            <div className="lg:col-span-7 border border-gray-200 rounded-lg p-2">
                                <div className="text-[11px] font-semibold text-gray-700 mb-1">Task Type</div>
                                <div>
                                    {!selectedCompany || !selectedUserId ? (
                                        <div className="text-[10px] text-gray-500 text-center py-4">Select a company and user to configure.</div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto">
                                            {taskTypeOptions.map((t) => {
                                                const checked = pendingTaskTypeIds.has(t.id);
                                                const disabled = !selectedCompany || !selectedUserId || loadingMappings || isApplying;
                                                return (
                                                    <label
                                                        key={t.id}
                                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] ${checked
                                                            ? 'bg-blue-50 border-blue-200'
                                                            : 'bg-white border-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={disabled}
                                                            onChange={() => toggleTaskType(t.id)}
                                                            className="h-3 w-3"
                                                        />
                                                        <span className="text-[11px] font-medium text-gray-700 truncate">{t.name || taskTypeNameById.get(t.id) || t.id}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleApply}
                                        disabled={!selectedCompany || !selectedUserId || isApplying}
                                        className={`inline-flex items-center px-3 py-1.5 text-[11px] font-medium rounded-lg ${!selectedCompany || !selectedUserId || isApplying ? 'bg-gray-300 text-white cursor-not-allowed' : `bg-[${theme.primary}] text-white hover:bg-[${theme.primaryDark}]`}`}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals - Keep existing structure */}
            <BulkAddCompaniesModal
                open={canBulkAddCompanies && showBulkCompanyModal}
                onClose={() => setShowBulkCompanyModal(false)}
                bulkCompanyNames={bulkCompanyNames}
                setBulkCompanyNames={(next) => setBulkCompanyNames(next)}
                onSubmit={handleSubmitBulkCompanies}
                isSubmitting={isCreatingBulkCompanies}
            />

            <BulkAddBrandsModal
                open={canBulkAddBrands && showBulkBrandModal}
                onClose={() => setShowBulkBrandModal(false)}
                bulkBrandForm={bulkBrandForm}
                setBulkBrandForm={(next) => setBulkBrandForm(next)}
                availableCompanies={companyOptions}
                companyUsers={companyUsers}
                currentUserRole={(currentUser as any)?.role}
                onSubmit={handleSubmitBulkBrands}
                isSubmitting={isCreatingBulkBrands}
            />

            <BulkAddTaskTypesModal
                open={canBulkAddTaskTypes && showBulkTaskTypeModal}
                onClose={() => setShowBulkTaskTypeModal(false)}
                bulkTaskTypeCompany={bulkTaskTypeCompany}
                setBulkTaskTypeCompany={(next) => setBulkTaskTypeCompany(next)}
                bulkTaskTypeNames={bulkTaskTypeNames}
                setBulkTaskTypeNames={(next) => setBulkTaskTypeNames(next)}
                availableCompanies={companyOptions}
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
        </div>
    );
};

export default AssignPage;