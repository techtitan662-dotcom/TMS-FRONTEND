import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Users, Shield, X, Check, CheckCircle, Loader2, ChevronDown, ChevronLeft, ChevronRight, Settings, UserCheck, Tags, Briefcase, Award, Star } from 'lucide-react';
import mdImpexAccessService from '../Services/MdImpexAccess.services';
import { taskTypeService, type TaskTypeItem } from '../Services/TaskType.service';
import { brandService } from '../Services/Brand.service';
import toast from 'react-hot-toast';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type MemberItem = {
    id: string;
    email: string;
    name: string;
    role: string;
    companyName: string;
};

type RoleItem = {
    id: string;
    role: string;
    emails: string[];
    description: string;
    createdAt: string;
    updatedAt?: string;
};

type PersonAccessItem = {
    id: string;
    assignedToEmail: string;
    assignedToName: string;
    assignedToRole: string;
    accessRole: string;
    allowedAssignees: string[];
    allowedTaskTypes?: string[];
    allowedBrands?: string[];
    showEmployeeOfMonth?: boolean;
    showMonthlyRanking?: boolean;
    showPowerStar?: boolean;
    createdAt: string;
    updatedAt?: string;
};

const ROLE_OPTIONS = [
    { value: 'manager', label: 'Manager' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'ob_manager', label: 'OB Manager' },
    { value: 'md_manager', label: 'MD Manager' },
    { value: 'troubleshoot_manager', label: 'Troubleshoot Manager' },
];

export default function MdImpexAccessPage({ allBrands, allTaskTypes }: { allBrands?: any[], allTaskTypes?: TaskTypeItem[] }) {
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [members, setMembers] = useState<MemberItem[]>([]);
    const [personAccess, setPersonAccess] = useState<PersonAccessItem[]>([]);
    const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [addingRole, setAddingRole] = useState(false);
    const [newRole, setNewRole] = useState({ key: '', name: '' });

    const [selectedRole, setSelectedRole] = useState('');
    const [selectedPerson, setSelectedPerson] = useState('');
    const [allowedAssignees, setAllowedAssignees] = useState<string[]>([]);
    const [allowedTaskTypes, setAllowedTaskTypes] = useState<string[]>([]);
    const [allowedBrands, setAllowedBrands] = useState<string[]>([]);
    const [showPersonModal, setShowPersonModal] = useState(false);
    const [editingPersonAccess, setEditingPersonAccess] = useState<PersonAccessItem | null>(null);

    const allRoles = useMemo(() => {
        const dynamicRoles = roles.map(r => ({
            value: r.role.toLowerCase().replace(/\s+/g, '_'),
            label: r.role,
            isDynamic: true,
            id: r.id
        }));

        const filteredStatic = ROLE_OPTIONS
            .filter(opt => !dynamicRoles.some(dr => dr.value === opt.value))
            .map(opt => ({ ...opt, isDynamic: false, id: undefined }));

        return [...filteredStatic, ...dynamicRoles];
    }, [roles]);

    const [currentRolePage, setCurrentRolePage] = useState(1);
    const rolesPerPage = 4;

    const paginatedRoles = useMemo(() => {
        const startIndex = (currentRolePage - 1) * rolesPerPage;
        return allRoles.slice(startIndex, startIndex + rolesPerPage);
    }, [allRoles, currentRolePage]);

    const totalRolePages = Math.ceil(allRoles.length / rolesPerPage);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    const paginatedPersonAccess = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return personAccess.slice(startIndex, startIndex + itemsPerPage);
    }, [personAccess, currentPage]);

    const totalPages = Math.ceil(personAccess.length / itemsPerPage);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            // Task types and Brands might be passed from parent
            const fetchTaskTypes = !allTaskTypes || allTaskTypes.length === 0;
            const fetchBrands = !allBrands || allBrands.length === 0;

            const [rolesRes, membersRes, personAccessRes, taskTypesRes, brandsRes] = await Promise.all([
                mdImpexAccessService.getAllRoles(),
                mdImpexAccessService.getAllMembers(),
                mdImpexAccessService.getAllPersonAccess(),
                fetchTaskTypes ? taskTypeService.getTaskTypes() : Promise.resolve({ success: true, data: allTaskTypes }),
                fetchBrands ? brandService.getBrands({ limit: 5000, includeDeleted: true }) : Promise.resolve({ success: true, data: allBrands })
            ]);

            if (rolesRes.success) setRoles(rolesRes.data);
            else setError(rolesRes.message);

            if (membersRes.success) setMembers(membersRes.data);
            else setError(membersRes.message);

            if (personAccessRes.success) setPersonAccess(personAccessRes.data);
            else setError(personAccessRes.message);

            if (taskTypesRes?.success) {
                setTaskTypes(taskTypesRes.data || []);
            }

            const rawBrands = brandsRes?.data || [];
            if (Array.isArray(rawBrands)) {
                const mdImpexBrands = rawBrands.filter((b: any) => {
                    const company = String(b?.company || b?.companyName || "").trim().toLowerCase().replace(/\s+/g, "");
                    return company === "mdimpex";
                });
                setBrands(mdImpexBrands);
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const [updatingAccess, setUpdatingAccess] = useState<Record<string, boolean>>({});

    const toggleExtraAccess = async (member: MemberItem, field: 'showEmployeeOfMonth' | 'showPowerStar') => {
        const pAccess = personAccess.find(p => p.assignedToEmail === member.email);
        const newValue = !(pAccess?.[field]);
        const updateKey = `${member.email}-${field}`;

        setUpdatingAccess(prev => ({ ...prev, [updateKey]: true }));

        // Optimistically update local state so the UI doesn't re-render/flash
        if (pAccess) {
            setPersonAccess(prev =>
                prev.map(p =>
                    p.id === pAccess.id ? { ...p, [field]: newValue } : p
                )
            );
        }

        try {
            if (pAccess) {
                const res = await mdImpexAccessService.updatePersonAccess(pAccess.id, {
                    allowedAssignees: pAccess.allowedAssignees || [],
                    allowedTaskTypes: pAccess.allowedTaskTypes,
                    allowedBrands: pAccess.allowedBrands,
                    showEmployeeOfMonth: field === 'showEmployeeOfMonth' ? newValue : pAccess.showEmployeeOfMonth,
                    showPowerStar: field === 'showPowerStar' ? newValue : pAccess.showPowerStar,
                    showMonthlyRanking: pAccess.showMonthlyRanking
                });
                if (res.success) {
                    toast.success(`Updated ${member.name}`);
                    // Sync the record returned from server if present, otherwise keep optimistic value
                    if (res.data) {
                        setPersonAccess(prev =>
                            prev.map(p => p.id === pAccess.id ? { ...p, ...res.data } : p)
                        );
                    }
                } else {
                    // Rollback on failure
                    setPersonAccess(prev =>
                        prev.map(p =>
                            p.id === pAccess.id ? { ...p, [field]: !newValue } : p
                        )
                    );
                    toast.error(res.message || 'Failed to update access');
                }
            } else {
                const res = await mdImpexAccessService.createPersonAccess({
                    assignedToEmail: member.email,
                    assignedToRole: member.role || 'manager',
                    allowedAssignees: [],
                    [field]: newValue,
                });
                if (res.success) {
                    toast.success(`Access initialized & updated for ${member.name}`);
                    // Add the new record to local state
                    if (res.data) {
                        setPersonAccess(prev => [...prev, res.data]);
                    } else {
                        // Fallback: fetch fresh data only when a NEW record is created
                        void loadData();
                    }
                } else {
                    toast.error(res.message || 'Failed to create access');
                }
            }
        } catch (error: any) {
            // Rollback optimistic update on error
            if (pAccess) {
                setPersonAccess(prev =>
                    prev.map(p =>
                        p.id === pAccess.id ? { ...p, [field]: !newValue } : p
                    )
                );
            }
            toast.error(error?.message || 'Error occurred');
        } finally {
            setUpdatingAccess(prev => ({ ...prev, [updateKey]: false }));
        }
    };

    const filteredMembers = useMemo(() => {
        if (!selectedRole) return [];
        return members.filter(m => m.role.toLowerCase() === selectedRole.toLowerCase());
    }, [members, selectedRole]);

    const sortedMarketerMembers = useMemo(() => {
        return [...members].sort((a, b) => {
            const aAccess = personAccess.find(p => p.assignedToEmail === a.email);
            const bAccess = personAccess.find(p => p.assignedToEmail === b.email);
            const aChecked = aAccess?.showEmployeeOfMonth ? 1 : 0;
            const bChecked = bAccess?.showEmployeeOfMonth ? 1 : 0;
            if (aChecked !== bChecked) return bChecked - aChecked;
            return a.name.localeCompare(b.name);
        });
    }, [members, personAccess]);

    const sortedPowerStarMembers = useMemo(() => {
        return [...members].sort((a, b) => {
            const aAccess = personAccess.find(p => p.assignedToEmail === a.email);
            const bAccess = personAccess.find(p => p.assignedToEmail === b.email);
            const aChecked = aAccess?.showPowerStar ? 1 : 0;
            const bChecked = bAccess?.showPowerStar ? 1 : 0;
            if (aChecked !== bChecked) return bChecked - aChecked;
            return a.name.localeCompare(b.name);
        });
    }, [members, personAccess]);

    const availableAssignees = useMemo(() => {
        if (!selectedPerson) return [];
        return members;
    }, [members, selectedPerson]);

    const handleCreateRole = async () => {
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

        setAddingRole(true);
        try {
            const res = await mdImpexAccessService.createRole({
                role: name,
                description: ''
            });
            if (res.success) {
                toast.success('Role added');
                setShowCreateModal(false);
                setNewRole({ key: '', name: '' });
                await loadData();
            } else {
                toast.error(res.message || 'Failed to add role');
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to add role'}`);
        } finally {
            setAddingRole(false);
        }
    };

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (!confirm(`Delete role "${roleName}"?`)) return;
        const res = await mdImpexAccessService.deleteRole(roleId);
        if (res.success) {
            toast.success('Role deleted');
            await loadData();
        } else {
            toast.error(res.message);
        }
    };

    const handleSavePersonAccess = async () => {
        if (!selectedPerson) {
            toast.error('Please select person');
            return;
        }

        setSaving(true);
        const payload = {
            assignedToEmail: selectedPerson,
            assignedToRole: selectedRole,
            allowedAssignees: allowedAssignees,
            allowedTaskTypes: allowedTaskTypes,
            allowedBrands: allowedBrands
        };

        let res;
        if (editingPersonAccess) {
            res = await mdImpexAccessService.updatePersonAccess(editingPersonAccess.id, {
                allowedAssignees: allowedAssignees,
                allowedTaskTypes: allowedTaskTypes,
                allowedBrands: allowedBrands
            });
        } else {
            res = await mdImpexAccessService.createPersonAccess(payload);
        }

        if (res.success) {
            toast.success(`Access ${editingPersonAccess ? 'updated' : 'created'}`);
            setShowPersonModal(false);
            resetPersonForm();
            await loadData();
        } else {
            toast.error(res.message);
        }
        setSaving(false);
    };

    const handleEditPersonAccess = (item: PersonAccessItem) => {
        setEditingPersonAccess(item);
        setSelectedRole(item.assignedToRole);
        setSelectedPerson(item.assignedToEmail);
        setAllowedAssignees(item.allowedAssignees || []);
        setAllowedTaskTypes(item.allowedTaskTypes || []);
        setAllowedBrands(item.allowedBrands || []);
        setShowPersonModal(true);
    };

    const handleDeletePersonAccess = async (id: string, personName: string) => {
        if (!confirm(`Delete access for "${personName}"?`)) return;
        const res = await mdImpexAccessService.deletePersonAccess(id);
        if (res.success) {
            toast.success('Access deleted');
            await loadData();
        } else {
            toast.error(res.message);
        }
    };

    const resetPersonForm = () => {
        setSelectedRole('');
        setSelectedPerson('');
        setAllowedAssignees([]);
        setAllowedTaskTypes([]);
        setAllowedBrands([]);
        setEditingPersonAccess(null);
    };

    const toggleAssignee = (userId: string) => {
        setAllowedAssignees(prev =>
            prev.includes(userId) ? prev.filter(e => e !== userId) : [...prev, userId]
        );
    };

    const toggleTaskType = (taskTypeName: string) => {
        const key = (taskTypeName || '').toString().trim().toLowerCase();
        if (!key) return;
        setAllowedTaskTypes(prev =>
            prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
        );
    };

    const toggleBrand = (brandName: string) => {
        const key = (brandName || '').toString().trim();
        if (!key) return;
        setAllowedBrands(prev =>
            prev.includes(key) ? prev.filter(b => b !== key) : [...prev, key]
        );
    };

    const toggleAllAssignees = () => {
        if (allowedAssignees.length === availableAssignees.length) {
            setAllowedAssignees([]);
        } else {
            setAllowedAssignees(availableAssignees.map(m => m.id));
        }
    };

    const toggleAllTaskTypes = () => {
        if (allowedTaskTypes.length === taskTypes.length) {
            setAllowedTaskTypes([]);
        } else {
            setAllowedTaskTypes(taskTypes.map(t => String(t.name || '').trim().toLowerCase()));
        }
    };

    const toggleAllBrands = () => {
        if (allowedBrands.length === brands.length) {
            setAllowedBrands([]);
        } else {
            setAllowedBrands(brands.map(b => String(b.name || '').trim()));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-3 md:p-4">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header - Compact */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <div className={`p-1.5 bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] rounded-lg`}>
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            MD Impex Access
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manage roles and permissions</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPersonModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Access
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-[${theme.primary}] text-white rounded-lg text-xs font-medium hover:bg-[${theme.primaryDark}] transition-colors`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create Role
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Members Card - Compact */}
                        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm`}>
                            <div className={`px-3 py-2 border-b border-gray-200 bg-[${theme.primaryUltralight}]`}>
                                <h2 className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    Members ({members.length})
                                </h2>
                            </div>
                            <div className="h-[320px] overflow-y-auto">
                                {members.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <p className="text-xs text-gray-500">No members found</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {members.map((member) => (
                                            <li key={member.id} className="p-2.5 hover:bg-gray-50">
                                                <p className="font-medium text-xs text-gray-900">{member.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{member.email}</p>
                                                <p className="text-[10px] text-blue-600 mt-0.5">{member.role}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Roles Card - Compact */}
                        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm`}>
                            <div className={`px-3 py-2 border-b border-gray-200 bg-[${theme.primaryUltralight}]`}>
                                <h2 className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    Roles ({allRoles.length})
                                </h2>
                            </div>
                            <div className="h-[320px] flex flex-col">
                                {allRoles.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                                        <p className="text-xs text-gray-500">No roles created</p>
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                        >
                                            Create role
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <ul className="flex-1 overflow-y-auto">
                                            {paginatedRoles.map((role) => (
                                                <li key={role.value} className="p-2.5 border-b border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="font-semibold text-xs text-gray-900">{role.label}</h3>
                                                                {role.isDynamic && (
                                                                    <span className="px-1 py-0.5 text-[8px] font-medium bg-purple-100 text-purple-700 rounded">Dynamic</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 mt-0.5">
                                                                {role.isDynamic ? (roles.find(r => r.id === role.id)?.emails?.length || 0) : 'Static'} members
                                                            </p>
                                                        </div>
                                                        {role.isDynamic && role.id && (
                                                            <button
                                                                onClick={() => handleDeleteRole(role.id!, role.label)}
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {totalRolePages > 1 && (
                                            <div className="p-2 border-t border-gray-100 flex items-center justify-center gap-2 bg-gray-50">
                                                <button
                                                    onClick={() => setCurrentRolePage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentRolePage === 1}
                                                    className="p-0.5 rounded border border-gray-200 bg-white disabled:opacity-50"
                                                >
                                                    <ChevronLeft className="w-3 h-3" />
                                                </button>
                                                <span className="text-[10px] font-medium text-gray-600">
                                                    {currentRolePage}/{totalRolePages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentRolePage(prev => Math.min(totalRolePages, prev + 1))}
                                                    disabled={currentRolePage === totalRolePages}
                                                    className="p-0.5 rounded border border-gray-200 bg-white disabled:opacity-50"
                                                >
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Person-wise Access Card - Compact */}
                        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            <div className={`px-3 py-2 border-b border-gray-200 bg-[${theme.primaryUltralight}]`}>
                                <h2 className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                                    <Settings className="w-3.5 h-3.5" />
                                    Access Config ({personAccess.length})
                                </h2>
                            </div>
                            <div className="h-[320px] flex flex-col">
                                {personAccess.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                                        <p className="text-xs text-gray-500">No access configured</p>
                                        <button
                                            onClick={() => setShowPersonModal(true)}
                                            className="mt-2 text-xs text-green-600 hover:text-green-700"
                                        >
                                            Add access
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <ul className="flex-1 overflow-y-auto">
                                            {paginatedPersonAccess.map((item) => (
                                                <li key={item.id} className="p-2.5 border-b border-gray-100 hover:bg-gray-50">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <h3 className="font-semibold text-xs text-gray-900 truncate">{item.assignedToName}</h3>
                                                                <span className="px-1.5 py-0.5 text-[8px] font-medium bg-blue-100 text-blue-800 rounded shrink-0">
                                                                    {item.assignedToRole}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 truncate mb-1">{item.assignedToEmail}</p>

                                                            {item.allowedBrands && item.allowedBrands.length > 0 && (
                                                                <div className="mb-1">
                                                                    <div className="flex flex-wrap gap-0.5">
                                                                        {item.allowedBrands.slice(0, 2).map((brand) => (
                                                                            <span key={brand} className="px-1 py-0.5 bg-purple-50 text-purple-700 text-[8px] rounded border border-purple-100">
                                                                                {brand}
                                                                            </span>
                                                                        ))}
                                                                        {item.allowedBrands.length > 2 && (
                                                                            <span className="text-[8px] text-gray-400">+{item.allowedBrands.length - 2}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-[10px] text-gray-600">
                                                                <span className="font-medium">Assignees:</span>
                                                                {item.allowedAssignees.length === 0 ? (
                                                                    <span className="ml-1 text-gray-400">All</span>
                                                                ) : (
                                                                    <span className="ml-1">{item.allowedAssignees.length} users</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button
                                                                onClick={() => handleEditPersonAccess(item)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePersonAccess(item.id, item.assignedToName)}
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        {totalPages > 1 && (
                                            <div className="p-2 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                                                <p className="text-[9px] text-gray-500">
                                                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, personAccess.length)} of {personAccess.length}
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage === 1}
                                                        className="p-0.5 rounded border border-gray-200 bg-white disabled:opacity-50"
                                                    >
                                                        <ChevronLeft className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-[10px] font-medium text-gray-600">{currentPage}/{totalPages}</span>
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className="p-0.5 rounded border border-gray-200 bg-white disabled:opacity-50"
                                                    >
                                                        <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Extra Access Features - Marketer of the month & Power star */}
                {!loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                        {/* Marketer of the Month Card */}
                        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col h-[400px]`}>
                            <div className={`px-3 py-2 border-b border-gray-200 bg-[${theme.primaryUltralight}] shrink-0`}>
                                <h2 className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-blue-600" />
                                    Marketer of the Month
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <ul className="divide-y divide-gray-100">
                                    {sortedMarketerMembers.map(member => {
                                        const pAccess = personAccess.find(p => p.assignedToEmail === member.email);
                                        const isChecked = !!pAccess?.showEmployeeOfMonth;
                                        const updateKey = `${member.email}-showEmployeeOfMonth`;
                                        const isUpdating = updatingAccess[updateKey];

                                        return (
                                            <li key={`motm-${member.id}`} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex items-center gap-1">
                                                        <p className="font-medium text-xs text-gray-900 truncate">{member.name}</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                                        {member.email}
                                                        {isChecked && <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center w-6">
                                                    {isUpdating ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                                    ) : (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleExtraAccess(member, 'showEmployeeOfMonth')}
                                                            className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        {/* Power Star of the Month Card */}
                        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col h-[400px]`}>
                            <div className={`px-3 py-2 border-b border-gray-200 bg-[${theme.primaryUltralight}] shrink-0`}>
                                <h2 className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                    Power Star of the Month
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <ul className="divide-y divide-gray-100">
                                    {sortedPowerStarMembers.map(member => {
                                        const pAccess = personAccess.find(p => p.assignedToEmail === member.email);
                                        const isChecked = !!pAccess?.showPowerStar;
                                        const updateKey = `${member.email}-showPowerStar`;
                                        const isUpdating = updatingAccess[updateKey];

                                        return (
                                            <li key={`psotm-${member.id}`} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex items-center gap-1">
                                                        <p className="font-medium text-xs text-gray-900 truncate">{member.name}</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                                        {member.email}
                                                        {isChecked && <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center w-6">
                                                    {isUpdating ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                                    ) : (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleExtraAccess(member, 'showPowerStar')}
                                                            className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Role Modal - Compact */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40">
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                            <div className={`p-4 border-b border-gray-100 bg-[${theme.primaryUltralight}] flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                        <Users className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Add Role</h3>
                                        <p className="text-[10px] text-gray-500">Create a new role</p>
                                    </div>
                                </div>
                                <button onClick={() => { if (addingRole) return; setShowCreateModal(false); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role Key <span className="text-red-500">*</span></label>
                                    <input
                                        value={newRole.key}
                                        onChange={(e) => setNewRole(prev => ({ ...prev, key: e.target.value }))}
                                        placeholder="e.g., designer"
                                        disabled={addingRole}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="text-[9px] text-gray-400 mt-0.5">Allowed: a-z, 0-9, _ and -</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Display Name <span className="text-red-500">*</span></label>
                                    <input
                                        value={newRole.name}
                                        onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Designer"
                                        disabled={addingRole}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button onClick={() => setShowCreateModal(false)} disabled={addingRole} className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleCreateRole} disabled={addingRole} className={`px-3 py-1.5 text-xs font-medium rounded-lg text-white ${addingRole ? 'bg-gray-400' : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`}`}>
                                        {addingRole ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                                        {addingRole ? 'Saving...' : 'Create Role'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Person Access Modal - Compact */}
                {showPersonModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                            <div className={`p-4 border-b border-gray-100 bg-[${theme.primaryUltralight}] flex items-center justify-between shrink-0`}>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {editingPersonAccess ? 'Edit Access' : 'Configure Access'}
                                    </h3>
                                    <p className="text-[10px] text-gray-500">Set permissions for team members</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPersonModal(false);
                                            resetPersonForm();
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Role and Email Selection */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                value={selectedRole}
                                                onChange={(e) => {
                                                    setSelectedRole(e.target.value);
                                                    setSelectedPerson('');
                                                }}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            >
                                                <option value="">Select Role...</option>
                                                {allRoles.map((role) => (
                                                    <option key={role.value} value={role.value}>{role.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                value={selectedPerson}
                                                onChange={(e) => setSelectedPerson(e.target.value)}
                                                disabled={!selectedRole}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none disabled:opacity-50"
                                            >
                                                <option value="">{selectedRole ? 'Select Email...' : 'Select role first'}</option>
                                                {filteredMembers.map((member) => (
                                                    <option key={member.id} value={member.email}>
                                                        {member.name} ({member.email})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {selectedRole === 'md_manager' && (
                                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                        <p className="text-[10px] text-blue-800">MD Manager typically has full access</p>
                                    </div>
                                )}

                                {/* Permissions Section */}
                                {selectedPerson && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Task Types */}
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col h-[280px]">
                                            <div className="px-2 py-1.5 bg-white border-b border-gray-200 flex items-center justify-between">
                                                <h4 className="font-medium text-[10px] text-gray-700 flex items-center gap-1">
                                                    <Tags className="w-3 h-3" />
                                                    Task Types
                                                </h4>
                                                <button onClick={toggleAllTaskTypes} className="text-[9px] font-medium text-blue-600">
                                                    {allowedTaskTypes.length === taskTypes.length ? 'Clear' : 'All'}
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                                {taskTypes.length === 0 ? (
                                                    <p className="text-[10px] text-gray-400 text-center py-2">No types</p>
                                                ) : (
                                                    taskTypes.map((t) => {
                                                        const label = String((t as any)?.name || '').trim();
                                                        const key = label.toLowerCase();
                                                        return (
                                                            <label key={key} className="flex items-center gap-1.5 p-1.5 rounded hover:bg-white cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allowedTaskTypes.includes(key)}
                                                                    onChange={() => toggleTaskType(label)}
                                                                    className="w-3 h-3 text-blue-600 rounded"
                                                                />
                                                                <span className="text-[10px] text-gray-700 truncate">{label}</span>
                                                            </label>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Brands */}
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col h-[280px]">
                                            <div className="px-2 py-1.5 bg-white border-b border-gray-200 flex items-center justify-between">
                                                <h4 className="font-medium text-[10px] text-gray-700 flex items-center gap-1">
                                                    <Briefcase className="w-3 h-3" />
                                                    Brands
                                                </h4>
                                                <button onClick={toggleAllBrands} className="text-[9px] font-medium text-blue-600">
                                                    {allowedBrands.length === brands.length ? 'Clear' : 'All'}
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                                {brands.length === 0 ? (
                                                    <p className="text-[10px] text-gray-400 text-center py-2">No brands</p>
                                                ) : (
                                                    brands.map((b) => {
                                                        const label = String(b?.name || '').trim();
                                                        return (
                                                            <label key={label} className="flex items-center gap-1.5 p-1.5 rounded hover:bg-white cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allowedBrands.includes(label)}
                                                                    onChange={() => toggleBrand(label)}
                                                                    className="w-3 h-3 text-blue-600 rounded"
                                                                />
                                                                <span className="text-[10px] text-gray-700 truncate">{label}</span>
                                                            </label>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Assignees */}
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col h-[280px]">
                                            <div className="px-2 py-1.5 bg-white border-b border-gray-200 flex items-center justify-between">
                                                <h4 className="font-medium text-[10px] text-gray-700 flex items-center gap-1">
                                                    <UserCheck className="w-3 h-3" />
                                                    Assignees
                                                </h4>
                                                <button onClick={toggleAllAssignees} className="text-[9px] font-medium text-blue-600">
                                                    {allowedAssignees.length === availableAssignees.length ? 'Clear' : 'All'}
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                                {availableAssignees.length === 0 ? (
                                                    <p className="text-[10px] text-gray-400 text-center py-2">No assignees</p>
                                                ) : (
                                                    availableAssignees.map((member) => (
                                                        <label key={member.id} className="flex items-center gap-1.5 p-1.5 rounded hover:bg-white cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={allowedAssignees.includes(member.id)}
                                                                onChange={() => toggleAssignee(member.id)}
                                                                className="w-3 h-3 text-blue-600 rounded"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-medium text-gray-700 truncate">{member.name}</p>
                                                                <p className="text-[8px] text-gray-400 truncate">{member.email}</p>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50 shrink-0">
                                <button
                                    onClick={() => {
                                        setShowPersonModal(false);
                                        resetPersonForm();
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePersonAccess}
                                    disabled={saving || !selectedPerson}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white ${saving || !selectedPerson ? 'bg-gray-400' : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`}`}
                                >
                                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {editingPersonAccess ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}