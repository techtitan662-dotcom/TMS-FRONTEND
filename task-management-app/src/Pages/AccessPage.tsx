import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X as XIcon, Pencil, Trash2, Shield, UserPlus, Users, ChevronRight, Filter, Search, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserType } from '../Types/Types';
import { accessService } from '../Services/Access.Services';
import mdImpexAccessService from '../Services/MdImpexAccess.services';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type PermissionValue = 'allow' | 'deny';

type AccessRow = {
    id: string;
    module: string;
    admin: PermissionValue;
    manager: PermissionValue;
    assistant: PermissionValue;
};

type UserAccess = {
    userId: string;
    moduleId: string;
    value: PermissionValue;
};

type RoleItem = {
    key: string;
    name: string;
};

const normalizeRole = (role: unknown) => (role || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');

const randomId = () => {
    return `access_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const permissionLabel: Record<PermissionValue, string> = {
    allow: 'Yes',
    deny: 'No',
};

const normalizePermission = (value: unknown): PermissionValue => {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === 'allow' || v === 'deny') {
        return v;
    }
    if (v === 'own') return 'deny';
    if (v === 'team') return 'deny';
    return 'deny';
};

const PermissionChoice: React.FC<{
    value: PermissionValue;
    selected: PermissionValue;
    onSelect: (next: PermissionValue) => void;
    disabled?: boolean;
}> = ({ value, selected, onSelect, disabled }) => {
    const isSelected = selected === value;

    const getButtonStyles = () => {
        const base = 'inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all';

        if (disabled) {
            return `${base} opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200`;
        }

        if (isSelected) {
            const colorMap: Record<PermissionValue, string> = {
                allow: `bg-emerald-100 text-emerald-700 border-emerald-300`,
                deny: 'bg-rose-100 text-rose-700 border-rose-300',
            };
            return `${base} ${colorMap[value]}`;
        }

        return `${base} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300`;
    };

    return (
        <button
            type="button"
            onClick={() => {
                if (disabled) return;
                onSelect(value);
            }}
            disabled={disabled}
            className={getButtonStyles()}
        >
            <span className={`mr-1.5 inline-flex items-center justify-center h-3 w-3 rounded border transition-colors ${isSelected
                ? value === 'allow' ? 'border-emerald-400 bg-emerald-200' :
                    'border-rose-400 bg-rose-200'
                : 'border-gray-300 bg-white'
                }`}
            >
                {isSelected ? (
                    <Check className={`h-2 w-2 ${value === 'allow' ? 'text-emerald-600' : 'text-rose-600'}`} />
                ) : null}
            </span>
            {permissionLabel[value]}
        </button>
    );
};

const PermissionSelect: React.FC<{
    value: PermissionValue;
    onChange: (next: PermissionValue) => void;
}> = ({ value, onChange }) => {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as PermissionValue)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
            <option value="allow" className="text-emerald-600">Allow</option>
            <option value="deny" className="text-rose-600">Deny</option>
        </select>
    );
};

type AccessPageProps = {
    currentUser: UserType;
    users: UserType[];
    onAddUser?: (newUser: Partial<UserType>) => Promise<UserType | void>;
    onRefreshCurrentUser?: () => Promise<void> | void;
};

const AccessPage: React.FC<AccessPageProps> = ({ currentUser, users, onAddUser, onRefreshCurrentUser }) => {

    const accessPermission = ((currentUser as any)?.permissions?.access_management || 'deny').toString().toLowerCase();
    const currentRole = normalizeRole((currentUser as any)?.role);
    const isMdManager = currentRole === 'md_manager';
    const isAdminUser = currentRole === 'admin' || currentRole === 'super_admin';
    const canOpenAccessPage = (isAdminUser || isMdManager) && accessPermission !== 'deny';

    if (!canOpenAccessPage) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm`}>
                <div className="text-sm font-semibold text-gray-900">Access denied</div>
                <div className="mt-1 text-xs text-gray-600">
                    You do not have permission to view this page.
                </div>
            </div>
        );
    }

    const [rows, setRows] = useState<AccessRow[]>([]);
    const [access, setAccess] = useState<UserAccess[]>([]);
    const [roles, setRoles] = useState<RoleItem[]>([]);

    const [search, setSearch] = useState('');

    const [selectedRoleTemplate, setSelectedRoleTemplate] = useState<string>('assistant');
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const [showModuleForm, setShowModuleForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formModule, setFormModule] = useState('');
    const [formAdmin, setFormAdmin] = useState<PermissionValue>('allow');
    const [formManager, setFormManager] = useState<PermissionValue>('deny');
    const [formAssistant, setFormAssistant] = useState<PermissionValue>('deny');

    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [addingUser, setAddingUser] = useState(false);

    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [addingRole, setAddingRole] = useState(false);
    const [newRole, setNewRole] = useState({ key: '', name: '' });

    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<{ key: string; name: string }>({ key: '', name: '' });
    const [savingRoleEdit, setSavingRoleEdit] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'assistant',
        password: '',
        department: '',
        position: '',
        phone: '',
    });

    const [applyingTemplate, setApplyingTemplate] = useState(false);

    const [savingPermission, setSavingPermission] = useState<{ userId: string; moduleId: string } | null>(null);

    const loadModules = useCallback(async () => {
        try {
            const res = await accessService.getModules();
            let list: any[] = [];
            if (Array.isArray(res)) {
                list = res as any[];
            } else if (Array.isArray((res as any)?.data)) {
                list = (res as any).data;
            } else if (Array.isArray((res as any)?.modules)) {
                list = (res as any).modules;
            } else if (Array.isArray((res as any)?.result)) {
                list = (res as any).result;
            } else if ((res as any)?.success && Array.isArray((res as any)?.data)) {
                list = (res as any).data;
            }

            const mapped: AccessRow[] = (list || [])
                .map((m: any) => ({
                    id: String(m?.moduleId || ''),
                    module: String(m?.name || m?.moduleId || ''),
                    admin: normalizePermission(m?.defaults?.admin),
                    manager: normalizePermission(m?.defaults?.manager),
                    assistant: normalizePermission(m?.defaults?.assistant),
                }))
                .filter((r: any) => Boolean(r?.id));

            let filtered = mapped;
            if (isMdManager) {
                const allowedModuleIds = [
                    'personal_tasks_page',
                    'company_task_type',
                    'create_task',
                    'task_type_bulk_add',
                    'delete_task',
                    'edit_any_task',
                    'company_brand_task_type',
                    'reports_analytics',
                    'brand_create',
                    'brand_bulk_add',
                    'brand_delete',
                    'brand_edit',
                ];
                filtered = mapped.filter((r) =>
                    allowedModuleIds.includes((r?.id || '').toLowerCase())
                );
            }

            const hasReportsAnalytics = filtered.some((r) => String(r?.id || '').trim().toLowerCase() === 'reports_analytics');
            if (!hasReportsAnalytics) {
                const analyzeRow = filtered.find((r) => String(r?.id || '').trim().toLowerCase() === 'analyze_page');
                filtered.push({
                    id: 'reports_analytics',
                    module: 'Reports / Analytics',
                    admin: analyzeRow?.admin || 'allow',
                    manager: analyzeRow?.manager || 'deny',
                    assistant: analyzeRow?.assistant || 'deny',
                });
            }

            const hasStrikePage = filtered.some((r) => String(r?.id || '').trim().toLowerCase() === 'strike_page');
            if (!hasStrikePage && !isMdManager) {
                filtered.push({
                    id: 'strike_page',
                    module: 'Strike Page',
                    admin: 'allow',
                    manager: 'allow',
                    assistant: 'deny',
                });
            }

            const hasPersonalTasksPage = filtered.some((r) => String(r?.id || '').trim().toLowerCase() === 'personal_tasks_page');
            if (!hasPersonalTasksPage) {
                filtered.push({
                    id: 'personal_tasks_page',
                    module: 'Personal Tasks Page',
                    admin: 'allow',
                    manager: 'allow',
                    assistant: 'deny',
                });
            }

            setRows(filtered);
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to load modules'}`);
            setRows([]);
        }
    }, [isMdManager]);

    const loadRoles = useCallback(async () => {
        try {
            if (isMdManager) {
                const mdRes = await mdImpexAccessService.getAllRoles();
                const mdList = Array.isArray((mdRes as any)?.data) ? (mdRes as any).data : [];
                
                if (mdList && mdList.length > 0) {
                    const allowedRolePatterns = ['md_manager', 'ob_manager', 'manager', 'assistant', 'sub_assistance', 'sbm', 'troubleshoot_manager'];
                    
                    const mdMapped: RoleItem[] = mdList
                        .map((r: any) => {
                            const roleName = String(r.role || '').trim();
                            const roleKey = roleName.toLowerCase().replace(/[\s-]+/g, '_');
                            return { roleKey, roleName };
                        })
                        .filter(({ roleKey }: { roleKey: string }) => {
                            return allowedRolePatterns.some(pattern => 
                                roleKey === pattern || roleKey.includes(pattern)
                            );
                        })
                        .map(({ roleKey, roleName }: { roleKey: string; roleName: string }) => ({
                            key: roleKey,
                            name: roleName,
                        }))
                        .filter((r: RoleItem) => Boolean(r.key));
                    
                    if (mdMapped.length > 0) {
                        setRoles(mdMapped);
                        return;
                    }
                }
                
                setRoles([
                    { key: 'md_manager', name: 'MD Manager' },
                    { key: 'ob_manager', name: 'OB Manager' },
                    { key: 'manager', name: 'Manager' },
                    { key: 'assistant', name: 'Assistant' },
                    { key: 'sub_assistance', name: 'Sub Assistance' },
                    { key: 'troubleshoot_manager', name: 'Troubleshoot Manager' },
                ]);
                return;
            }

            const res = await accessService.getRoles();
            const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
            const mapped: RoleItem[] = list
                .map((r: any) => ({
                    key: String(r?.key || '').trim().toLowerCase(),
                    name: String(r?.name || r?.key || '').trim(),
                }))
                .filter((r: RoleItem) => Boolean(r.key));

            const fallback: RoleItem[] = [
                { key: 'admin', name: 'Administrator' },
                { key: 'manager', name: 'Manager' },
                { key: 'assistant', name: 'Assistant' },
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
                { key: 'sales_manager', name: 'Sales Manager' },
                { key: 'sales_man', name: 'Sales Man' },
            ];
            const merged = [...fallback, ...mapped];
            const uniq = new Map<string, RoleItem>();
            merged.forEach(r => {
                const k = (r.key || '').toLowerCase();
                if (!k) return;
                if (!uniq.has(k)) uniq.set(k, r);
            });

            setRoles(Array.from(uniq.values()));
        } catch (e: any) {
            console.error('Load roles error:', e);
            if (isMdManager) {
                setRoles([
                    { key: 'md_manager', name: 'MD Manager' },
                    { key: 'ob_manager', name: 'OB Manager' },
                    { key: 'manager', name: 'Manager' },
                    { key: 'assistant', name: 'Assistant' },
                    { key: 'sub_assistance', name: 'Sub Assistance' },
                    { key: 'troubleshoot_manager', name: 'Troubleshoot Manager' },
                ]);
            } else {
                setRoles([
                    { key: 'admin', name: 'Administrator' },
                    { key: 'manager', name: 'Manager' },
                    { key: 'assistant', name: 'Assistant' },
                ]);
            }
        }
    }, [isMdManager]);

    const loadUserPermissions = useCallback(async (userId: string) => {
        try {
            const res = await accessService.getUserPermissions(userId);
            const map = ((res as any)?.data && typeof (res as any).data === 'object') ? (res as any).data : {};
            const entries: UserAccess[] = Object.keys(map).map((moduleId) => ({
                userId,
                moduleId,
                value: normalizePermission(map[moduleId]),
            }));
            setAccess(entries);
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to load permissions'}`);
        }
    }, []);

    useEffect(() => {
        if (!canOpenAccessPage) return;
        loadModules();
        loadRoles();
    }, [canOpenAccessPage, loadModules, loadRoles]);

    const effectiveUsers = useMemo(() => {
        let list = (Array.isArray(users) && users.length > 0) ? users : [currentUser];
        
        if (isMdManager) {
            const normalizeCompanyKey = (value: unknown) => String(value || '')
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '');
            const mdImpexKey = 'mdimpex';
            
            list = list.filter((u: any) => {
                const companyKey = normalizeCompanyKey(u?.companyName || u?.company || '');
                return companyKey === mdImpexKey;
            });
        }
        
        return list;
    }, [currentUser, users, isMdManager]);

    const filteredUsersByRole = useMemo(() => {
        const targetRole = normalizeRole(selectedRoleTemplate);
        return (effectiveUsers || []).filter(u => normalizeRole((u as any)?.role) === targetRole);
    }, [effectiveUsers, selectedRoleTemplate]);

    useEffect(() => {
        if (roles.length === 0) return;
        
        if (isMdManager && selectedRoleTemplate === 'assistant') {
            const firstMdRole = roles.length > 0 ? roles[0]?.key : 'assistant';
            setSelectedRoleTemplate(firstMdRole);
            return;
        }
        
        const exists = roles.some(r => normalizeRole(r.key) === normalizeRole(selectedRoleTemplate));
        if (!exists) {
            const defaultRole = isMdManager && roles.length > 0 ? roles[0]?.key : 'assistant';
            setSelectedRoleTemplate(defaultRole);
        }
    }, [roles, selectedRoleTemplate, isMdManager]);

    useEffect(() => {
        if (filteredUsersByRole.length === 0) {
            setSelectedUserId('');
            return;
        }

        const isValid = filteredUsersByRole.some(u => {
            const uid = (u?.id || (u as any)?._id || '').toString();
            return uid && uid === selectedUserId;
        });

        if (!selectedUserId || !isValid) {
            const firstId = (filteredUsersByRole[0]?.id || (filteredUsersByRole[0] as any)?._id || '').toString();
            setSelectedUserId(firstId);
        }
    }, [filteredUsersByRole, selectedUserId]);

    useEffect(() => {
        if (selectedUserId) return;
        const meId = (currentUser?.id || (currentUser as any)?._id || '').toString();
        if (meId) setSelectedUserId(meId);
    }, [currentUser, selectedUserId]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const hiddenModuleIds = new Set(['dashboard_view', 'view_all_tasks', 'view_assigned_tasks', 'assign_task']);
        const base = (rows || []).filter(r => !hiddenModuleIds.has((r?.id || '').toLowerCase()));

        const normalizeLabel = (value: unknown) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const isBrandsCompaniesReport = (label: unknown) => {
            const text = normalizeLabel(label);
            return text.includes('brand') && text.includes('compan') && text.includes('report');
        };

        const seenBrandsCompaniesReport = new Set<string>();
        const dedupedBase = base.filter((r) => {
            if (!isBrandsCompaniesReport(r?.module)) return true;
            const key = normalizeLabel(r?.module);
            if (seenBrandsCompaniesReport.has(key)) return false;
            seenBrandsCompaniesReport.add(key);
            return true;
        });

        if (!term) return dedupedBase;
        return dedupedBase.filter(r => (r.module || '').toLowerCase().includes(term));
    }, [rows, search]);

    const groupedRows = useMemo(() => {
        const groups: Record<'page' | 'task' | 'brand' | 'other', AccessRow[]> = {
            page: [],
            task: [],
            brand: [],
            other: [],
        };

        (filteredRows || []).forEach((r) => {
            const key = `${r.id} ${r.module}`.toLowerCase();
            const name = (r.module || '').toLowerCase();
            const moduleId = (r.id || '').toLowerCase();
            if (name.includes('reports') || name.includes('analytics') || name.includes('dashboard')) {
                groups.page.push(r);
                return;
            }
            if (moduleId === 'access_management' || moduleId === 'brands_page') {
                groups.page.push(r);
                return;
            }
            if (moduleId === 'tasks_page') {
                groups.page.push(r);
                return;
            }
            if (key.includes('brand')) {
                groups.brand.push(r);
            } else if (key.includes('task')) {
                groups.task.push(r);
            } else if (key.includes('page')) {
                groups.page.push(r);
            } else {
                groups.other.push(r);
            }
        });

        return groups;
    }, [filteredRows]);

    const canManageAccess = isAdminUser && canOpenAccessPage;

    const selectedUser = useMemo(() => {
        const uid = selectedUserId.toString();
        return filteredUsersByRole.find(u => (u.id || (u as any)._id || '').toString() === uid) || null;
    }, [filteredUsersByRole, selectedUserId]);

    useEffect(() => {
        const uid = (selectedUser?.id || (selectedUser as any)?._id || '').toString();
        if (!uid) return;
        loadUserPermissions(uid);
    }, [loadUserPermissions, selectedUser]);

    const isSelectedUserEditable = useMemo(() => {
        if (!selectedUser) return false;
        return true;
    }, [selectedUser]);

    const getUserModuleValue = useCallback((userId: string, moduleId: string): PermissionValue => {
        const found = access.find(a => a.userId === userId && a.moduleId === moduleId);
        if (found?.value) return normalizePermission(found.value);
        return 'deny';
    }, [access]);

    const setUserModuleValue = async (userId: string, moduleId: string, value: PermissionValue) => {
        if (!canManageAccess) return;

        const meId = (currentUser?.id || (currentUser as any)?._id || '').toString();
        if (meId && meId === userId) {
            const ok = window.confirm(
                'You are changing your own access permissions. This may affect what you can access. Do you want to continue?'
            );
            if (!ok) return;
        }

        setAccess((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            const idx = list.findIndex(a => a.userId === userId && a.moduleId === moduleId);
            if (idx >= 0) {
                list[idx] = { ...list[idx], value };
                return list;
            }
            list.push({ userId, moduleId, value });
            return list;
        });

        setSavingPermission({ userId, moduleId });
        try {
            await accessService.setUserPermission(userId, moduleId, value);
            await loadUserPermissions(userId);

            if (meId && meId === userId && onRefreshCurrentUser) {
                await onRefreshCurrentUser();
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to update permission'}`);
            await loadUserPermissions(userId);
        } finally {
            setSavingPermission(null);
        }
    };

    const applyTemplateToSelectedUser = async (options?: { overwrite?: boolean }) => {
        if (!selectedUser) {
            toast.error('Select a user first');
            return;
        }
        if (!isSelectedUserEditable) {
            toast.error('You do not have permission to edit this user');
            return;
        }

        const uid = (selectedUser.id || (selectedUser as any)._id || '').toString();
        if (!uid) {
            toast.error('Invalid user');
            return;
        }

        const meId = (currentUser?.id || (currentUser as any)?._id || '').toString();
        if (meId && meId === uid) {
            const ok = window.confirm(
                'You are applying a permission template to your own account. This can change multiple permissions. Do you want to continue?'
            );
            if (!ok) return;
        }

        setApplyingTemplate(true);
        try {
            const overwrite = Boolean(options?.overwrite);
            if (overwrite) {
                const ok = window.confirm('Overwrite ALL existing permissions for this user with the selected role template?');
                if (!ok) {
                    setApplyingTemplate(false);
                    return;
                }
            }

            await accessService.applyTemplate(uid, selectedRoleTemplate, { overwrite });
            toast.success(overwrite ? 'Template applied (overwritten)' : 'Template applied');
            await loadUserPermissions(uid);

            if (meId && meId === uid && onRefreshCurrentUser) {
                await onRefreshCurrentUser();
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to apply template'}`);
        } finally {
            setApplyingTemplate(false);
        }
    };

    const openAddModule = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setEditingId(null);
        setFormModule('');
        setFormAdmin('allow');
        setFormManager('deny');
        setFormAssistant('deny');
        setShowModuleForm(true);
    };

    const openAddRole = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setNewRole({ key: '', name: '' });
        setShowAddRoleModal(true);
    };

    const saveNewRole = async () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = (newRole.key || '').trim().toLowerCase();
        const name = (newRole.name || '').trim();

        if (!key || !name) {
            toast.error('Role key and name are required');
            return;
        }

        if (!/^[a-z0-9_-]+$/.test(key)) {
            toast.error('Role key can contain only a-z, 0-9, _ and -');
            return;
        }

        const exists = roles.some(r => normalizeRole(r.key) === key);
        if (exists) {
            toast.error('This role already exists');
            return;
        }

        setAddingRole(true);
        try {
            await accessService.createRole({ key, name });
            toast.success('Role added');
            setShowAddRoleModal(false);
            await loadRoles();
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to add role'}`);
        } finally {
            setAddingRole(false);
        }
    };

    const openEditRole = (roleItem: RoleItem) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = normalizeRole(roleItem?.key);
        if (!key) return;

        if (key === 'admin' || key === 'manager' || key === 'assistant') {
            toast.error('Core roles cannot be edited');
            return;
        }

        setEditingRole({ key, name: String(roleItem?.name || roleItem?.key || '').trim() });
        setShowEditRoleModal(true);
    };

    const saveRoleEdit = async () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = normalizeRole(editingRole?.key);
        const name = String(editingRole?.name || '').trim();
        if (!key || !name) {
            toast.error('Role name is required');
            return;
        }

        setSavingRoleEdit(true);
        try {
            await accessService.updateRole(key, { name });
            toast.success('Role updated');
            setShowEditRoleModal(false);
            await loadRoles();
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to update role'}`);
        } finally {
            setSavingRoleEdit(false);
        }
    };

    const deleteRole = async (roleKey: string) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = normalizeRole(roleKey);
        if (!key) return;
        if (key === 'admin' || key === 'manager' || key === 'assistant') {
            toast.error('Core roles cannot be deleted');
            return;
        }

        const ok = window.confirm(`Delete role "${key}"? Users with this role will be moved to assistant.`);
        if (!ok) return;

        setSavingRoleEdit(true);
        try {
            await accessService.deleteRole(key);
            toast.success('Role deleted');
            await loadRoles();

            if (normalizeRole(selectedRoleTemplate) === key) {
                setSelectedRoleTemplate('assistant');
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to delete role'}`);
        } finally {
            setSavingRoleEdit(false);
        }
    };

    const openAddUser = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setNewUser({
            name: '',
            email: '',
            role: 'assistant',
            password: '',
            department: '',
            position: '',
            phone: '',
        });
        setShowAddUserModal(true);
    };

    const saveNewUser = async () => {
        if (!onAddUser) {
            toast.error('Add user is not configured');
            return;
        }
        if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
            toast.error('Please fill all required fields');
            return;
        }

        setAddingUser(true);
        try {
            const payload: Partial<UserType> = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: newUser.role,
                department: newUser.department,
                position: newUser.position,
                phone: newUser.phone,
            };
            await onAddUser(payload);
            toast.success('User added');
            setShowAddUserModal(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to add user');
        } finally {
            setAddingUser(false);
        }
    };


    const onSave = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const moduleName = formModule.trim();
        if (!moduleName) {
            toast.error('Module name is required');
            return;
        }

        const duplicate = rows.some(r => r.module.trim().toLowerCase() === moduleName.toLowerCase() && r.id !== (editingId || ''));
        if (duplicate) {
            toast.error('This module already exists');
            return;
        }

        if (editingId) {
            accessService.updateModule(editingId, {
                name: moduleName,
                defaults: { admin: formAdmin, manager: formManager, assistant: formAssistant },
            })
                .then(() => {
                    toast.success('Access rule updated');
                    loadModules();
                })
                .catch((e: any) => {
                    const status = e?.response?.status;
                    const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
                    toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to update module'}`);
                });
        } else {
            const moduleId = randomId();
            accessService.createModule({
                moduleId,
                name: moduleName,
                defaults: { admin: formAdmin, manager: formManager, assistant: formAssistant },
            })
                .then(() => {
                    toast.success('Access rule added');
                    loadModules();
                })
                .catch((e: any) => {
                    const status = e?.response?.status;
                    const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
                    toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to create module'}`);
                });
        }

        setShowModuleForm(false);
    };

    const openEdit = (row: AccessRow) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setEditingId(row.id);
        setFormModule(row.module);
        setFormAdmin(row.admin);
        setFormManager(row.manager);
        setFormAssistant(row.assistant);
        setShowModuleForm(true);
    };

    const onDelete = (row: AccessRow) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        const ok = window.confirm(`Delete access rule for "${row.module}"?`);
        if (!ok) return;
        accessService.deleteModule(row.id)
            .then(() => {
                toast.success('Access rule deleted');
                loadModules();
            })
            .catch((e: any) => {
                const status = e?.response?.status;
                const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
                toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to delete module'}`);
            });
    };

    const roleOptions = useMemo(() => {
        const list = roles.length > 0 ? roles : [
            { key: 'admin', name: 'Administrator' },
            { key: 'manager', name: 'Manager' },
            { key: 'assistant', name: 'Assistant' },
        ];
        return list.map(r => ({ value: r.key, label: r.name || r.key, disabled: false }));
    }, [roles]);

    return (
        <div className="w-full min-h-screen bg-gray-50 p-3 md:p-4">
            <div className="w-full max-w-7xl mx-auto space-y-4">
                {/* Header - Compact */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg shadow-sm`}>
                            <Shield className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Access Management</h1>
                            <p className="text-[10px] text-gray-500 mt-0.5">Fine-grained control over user permissions</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search modules..."
                                className="w-48 pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {isAdminUser && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={openAddModule}
                                    className={`inline-flex items-center px-2.5 py-1.5 bg-[${theme.primary}] text-white text-[11px] font-medium rounded-lg hover:bg-[${theme.primaryDark}] transition-colors`}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Module
                                </button>
                                <button
                                    onClick={openAddUser}
                                    className="inline-flex items-center px-2.5 py-1.5 bg-blue-600 text-white text-[11px] font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    User
                                </button>
                                <button
                                    onClick={openAddRole}
                                    className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Role
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Role & User Selection - Compact */}
                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                    <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-semibold tracking-wide text-blue-600 uppercase">Role & User Selection</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Choose a role template and target user</p>
                            </div>
                            {selectedUser && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Shield className="h-3 w-3 text-blue-500" />
                                    <span className="font-medium text-gray-800">{selectedUser.name || selectedUser.email || 'Selected user'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-3">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                            <div className="lg:col-span-4">
                                <label className="block text-[11px] font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <Filter className="h-3 w-3 text-blue-600" />
                                    Role Template
                                </label>
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-2">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                        {(roles.length > 0 ? roles : [{ key: 'admin', name: 'Administrator' }, { key: 'manager', name: 'Manager' }, { key: 'assistant', name: 'Assistant' }]).map((r) => {
                                            const key = normalizeRole(r.key);
                                            const isCore = key === 'admin' || key === 'manager' || key === 'assistant';
                                            return (
                                                <div key={r.key}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRoleTemplate(r.key)}
                                                        className={`group relative w-full px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${isAdminUser && !isCore ? 'pr-12' : ''} ${normalizeRole(selectedRoleTemplate) === normalizeRole(r.key)
                                                            ? `bg-[${theme.primary}] text-white border border-[${theme.primary}]`
                                                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="capitalize">{(r.name || r.key).substring(0, 12)}</span>

                                                        {isAdminUser && !isCore && (
                                                            <span className="absolute top-0.5 right-0.5 flex items-center gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        openEditRole(r);
                                                                    }}
                                                                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/80 hover:bg-white border border-gray-200 text-blue-600"
                                                                >
                                                                    <Pencil className="h-2.5 w-2.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        void deleteRole(r.key);
                                                                    }}
                                                                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/80 hover:bg-white border border-gray-200 text-rose-600"
                                                                >
                                                                    <Trash2 className="h-2.5 w-2.5" />
                                                                </button>
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-8">
                                <label className="block text-[11px] font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <Users className="h-3 w-3 text-blue-600" />
                                    Select User
                                </label>
                                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <div className="relative flex-1">
                                            <ChevronRight className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-blue-600" />
                                            <select
                                                value={selectedUserId}
                                                onChange={(e) => setSelectedUserId(e.target.value)}
                                                className="w-full pl-7 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {filteredUsersByRole.map(u => {
                                                    const uid = (u.id || (u as any)._id || '').toString();
                                                    return (
                                                        <option key={uid} value={uid}>
                                                            {u.name || 'User'} ({u.email || '-'})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {isAdminUser && (
                                            <button
                                                type="button"
                                                onClick={() => applyTemplateToSelectedUser({ overwrite: false })}
                                                disabled={applyingTemplate || !selectedUser}
                                                className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${applyingTemplate || !selectedUser
                                                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                                    : `bg-[${theme.primary}] text-white hover:bg-[${theme.primaryDark}]`
                                                    }`}
                                            >
                                                {applyingTemplate ? (
                                                    <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Apply</span>
                                                ) : 'Apply'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permission Matrix - Compact */}
                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden`}>
                    <div className={`px-3 py-2 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-900">Permission Matrix</h3>
                            <span className="text-[10px] text-gray-500">{filteredRows.length} modules</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={`bg-[white] border-b border-gray-100`}>
                                    <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-700 uppercase">Feature / Module</th>
                                    <th className="text-center px-3 py-2 text-[10px] font-semibold text-gray-700 uppercase">Permission</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center" colSpan={2}>
                                            <p className="text-xs text-gray-500">No modules found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    ([
                                        { key: 'page' as const, title: 'Page Access' },
                                        { key: 'task' as const, title: 'Task Access' },
                                        { key: 'brand' as const, title: 'Brand Access' },
                                        { key: 'other' as const, title: 'Other' },
                                    ]).map((section) => (
                                        groupedRows[section.key].length > 0 ? (
                                            <React.Fragment key={section.key}>
                                                <tr className={`bg-[${theme.primaryUltralight}]`}>
                                                    <td colSpan={2} className="px-3 py-1.5 text-[9px] font-semibold text-gray-600 uppercase">
                                                        {section.title}
                                                    </td>
                                                </tr>
                                                {groupedRows[section.key].map((row) => (
                                                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-medium text-gray-900">{row.module}</span>
                                                                {isAdminUser && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                openEdit(row);
                                                                            }}
                                                                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-blue-600"
                                                                        >
                                                                            <Pencil className="h-3 w-3" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                onDelete(row);
                                                                            }}
                                                                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-rose-600"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            {selectedUser ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {(['allow', 'deny'] as PermissionValue[]).map((v) => (
                                                                        <PermissionChoice
                                                                            key={v}
                                                                            value={v}
                                                                            selected={getUserModuleValue((selectedUser.id || (selectedUser as any)._id || '').toString(), row.id)}
                                                                            disabled={!isSelectedUserEditable || (savingPermission?.userId === (selectedUser.id || (selectedUser as any)._id || '').toString() && savingPermission?.moduleId === row.id)}
                                                                            onSelect={(next) => {
                                                                                if (!isSelectedUserEditable) {
                                                                                    toast.error('You do not have permission to edit this user');
                                                                                    return;
                                                                                }
                                                                                const uid = (selectedUser.id || (selectedUser as any)._id || '').toString();
                                                                                void setUserModuleValue(uid, row.id, next);
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-400 text-[10px] text-center">Select a user</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ) : null
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals remain with compact styling - keeping existing modal structure but with reduced sizes */}
                {isAdminUser && showModuleForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowModuleForm(false)} />
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                            <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}] flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                        <Shield className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">{editingId ? 'Edit Module' : 'Add Module'}</h3>
                                        <p className="text-[10px] text-gray-500">Set default access levels</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModuleForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-4 py-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Module Name</label>
                                    <input
                                        value={formModule}
                                        onChange={(e) => setFormModule(e.target.value)}
                                        placeholder="e.g., tasks"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-700 mb-1">Admin</label>
                                        <PermissionSelect value={formAdmin} onChange={setFormAdmin} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-700 mb-1">Manager</label>
                                        <PermissionSelect value={formManager} onChange={setFormManager} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-700 mb-1">Assistant</label>
                                        <PermissionSelect value={formAssistant} onChange={setFormAssistant} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button onClick={() => setShowModuleForm(false)} className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={onSave} className={`px-3 py-1.5 text-xs font-medium rounded-lg bg-[${theme.primary}] text-white hover:bg-[${theme.primaryDark}]`}>
                                        {editingId ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isAdminUser && showAddUserModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddUserModal(false)} />
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-600 rounded-lg">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Add New User</h3>
                                        <p className="text-[10px] text-gray-500">Create a user and assign permissions</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddUserModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-4 py-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                                        <input value={newUser.name} onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))} placeholder="John Doe" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                        <input type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} placeholder="john@example.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                                        <input type="password" value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} placeholder="Temporary password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                        <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs">
                                            {roleOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-4">
                                    <button onClick={() => setShowAddUserModal(false)} className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={saveNewUser} disabled={addingUser} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${addingUser ? 'bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                        {addingUser ? 'Creating...' : 'Create User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isAdminUser && showAddRoleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40">
                        <div className="absolute inset-0 bg-black/40" onClick={() => { if (addingRole) return; setShowAddRoleModal(false); }} />
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-600 rounded-lg">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Add Role</h3>
                                        <p className="text-[10px] text-gray-500">Create a new role</p>
                                    </div>
                                </div>
                                <button onClick={() => { if (addingRole) return; setShowAddRoleModal(false); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-4 py-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Role Key</label>
                                        <input value={newRole.key} onChange={(e) => setNewRole(prev => ({ ...prev, key: e.target.value }))} placeholder="e.g., designer" disabled={addingRole} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                                        <div className="text-[9px] text-gray-400 mt-0.5">a-z, 0-9, _, -</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                                        <input value={newRole.name} onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Designer" disabled={addingRole} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-4">
                                    <button onClick={() => setShowAddRoleModal(false)} disabled={addingRole} className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={saveNewRole} disabled={addingRole} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${addingRole ? 'bg-emerald-300 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                        {addingRole ? 'Saving...' : 'Create Role'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isAdminUser && showEditRoleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40">
                        <div className="absolute inset-0 bg-black/40" onClick={() => { if (savingRoleEdit) return; setShowEditRoleModal(false); }} />
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                            <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}] flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Edit Role</h3>
                                        <p className="text-[10px] text-gray-500">Update role display name</p>
                                    </div>
                                </div>
                                <button onClick={() => { if (savingRoleEdit) return; setShowEditRoleModal(false); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-4 py-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Role Key</label>
                                        <input value={editingRole.key} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs opacity-80" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                                        <input value={editingRole.name} onChange={(e) => setEditingRole(prev => ({ ...prev, name: e.target.value }))} disabled={savingRoleEdit} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-4">
                                    <button onClick={() => setShowEditRoleModal(false)} disabled={savingRoleEdit} className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={() => void saveRoleEdit()} disabled={savingRoleEdit} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${savingRoleEdit ? 'bg-gray-400 text-white' : `bg-[${theme.primary}] text-white hover:bg-[${theme.primaryDark}]`}`}>
                                        {savingRoleEdit ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccessPage;