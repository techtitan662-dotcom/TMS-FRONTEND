import { Tag, X } from 'lucide-react';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type BulkBrandForm = {
    company: string;
    brandNames: string;
    groupNumber?: string;
    groupName?: string;
    rmEmail?: string;
    amEmail?: string;
};

type CompanyUser = {
    id: string | number;
    name: string;
    email: string;
    role?: string;
    managerId?: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    bulkBrandForm: BulkBrandForm;
    setBulkBrandForm: (next: BulkBrandForm) => void;
    availableCompanies: string[];
    companyUsers?: CompanyUser[];
    currentUserRole?: string;
    onSubmit: () => void;
    isSubmitting: boolean;
};

const BulkAddBrandsModal = ({
    open,
    onClose,
    bulkBrandForm,
    setBulkBrandForm,
    availableCompanies,
    companyUsers,
    currentUserRole,
    onSubmit,
    isSubmitting,
}: Props) => {
    if (!open) return null;

    const parseGroupAndBrandColumns = (raw: string) => {
        const lines = (raw || '').split(/\r?\n/);
        const groupNumbers: string[] = [];
        const brandNames: string[] = [];

        for (let i = 0; i < lines.length; i += 1) {
            const line = (lines[i] || '').replace(/\r/g, '').trim();
            if (!line) continue;

            let g = '';
            let b = '';

            if (line.includes('\t')) {
                const parts = line.split(/\t+/);
                g = (parts[0] || '').trim();
                b = (parts.slice(1).join(' ') || '').trim();
            } else if (line.includes('|')) {
                const parts = line.split('|');
                g = (parts[0] || '').trim();
                b = (parts.slice(1).join('|') || '').trim();
            } else if (line.includes(',')) {
                const parts = line.split(',');
                g = (parts[0] || '').trim();
                b = (parts.slice(1).join(',') || '').trim();
            } else {
                const m = line.match(/^(\S+)\s+(.*)$/);
                if (m) {
                    g = (m[1] || '').trim();
                    b = (m[2] || '').trim();
                } else {
                    g = line;
                    b = '';
                }
            }

            const gLower = g.toLowerCase();
            const bLower = b.toLowerCase();
            const looksLikeHeader =
                i === 0 &&
                (gLower.includes('group') || gLower.includes('number')) &&
                (bLower.includes('brand') || bLower.includes('name'));
            if (looksLikeHeader) continue;

            if (!g && !b) continue;
            if (g && !b) continue;
            if (!g && b) continue;

            groupNumbers.push(g);
            brandNames.push(b);
        }

        return { groupNumbers, brandNames };
    };

    const normalizedRole = (currentUserRole || '').toString().trim().toLowerCase();
    const canUseGroupFields =
        normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'abm' || normalizedRole === 'sbm';
    const companyKey = (bulkBrandForm.company || '').toString().trim().toLowerCase().replace(/\s+/g, '');
    const isSpeedEcomCompany = companyKey === 'speedecom';
    const showGroupFields = canUseGroupFields && isSpeedEcomCompany;

    const normalizeUserRole = (v: unknown) => (v || '').toString().trim().toLowerCase();
    const safeUsers = Array.isArray(companyUsers) ? companyUsers : [];

    const rmUsers = safeUsers.filter((u) => normalizeUserRole(u.role) === 'rm');
    const allAmUsers = safeUsers.filter((u) => {
        const r = normalizeUserRole(u.role);
        return r === 'am' || r === 'ar';
    });

    const selectedRm = rmUsers.find((u) => (u.email || '').toString().trim().toLowerCase() === (bulkBrandForm.rmEmail || '').toString().trim().toLowerCase());
    const selectedRmId = selectedRm?.id ? selectedRm.id.toString() : '';
    const filteredAmUsers = selectedRmId
        ? allAmUsers.filter((u) => (u.managerId || '').toString() === selectedRmId)
        : allAmUsers;

    const handleRmChange = (rmEmail: string) => {
        const nextRm = (rmEmail || '').toString();
        const nextRmUser = rmUsers.find((u) => (u.email || '').toString().trim().toLowerCase() === nextRm.trim().toLowerCase());
        const nextRmId = nextRmUser?.id ? nextRmUser.id.toString() : '';
        const nextFiltered = nextRmId
            ? allAmUsers.filter((u) => (u.managerId || '').toString() === nextRmId)
            : allAmUsers;

        const currentAm = (bulkBrandForm.amEmail || '').toString().trim().toLowerCase();
        const stillValid = nextFiltered.some((u) => (u.email || '').toString().trim().toLowerCase() === currentAm);
        const nextAm = stillValid
            ? bulkBrandForm.amEmail
            : nextFiltered.length === 1
                ? nextFiltered[0].email
                : nextFiltered.length > 0
                    ? nextFiltered[0].email
                    : '';

        setBulkBrandForm({
            ...bulkBrandForm,
            rmEmail: rmEmail,
            amEmail: nextAm,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header - Compact */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <Tag className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Bulk Add Brands</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Add multiple brands for a company</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form Content - Compact */}
                <div className="px-4 py-4 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        {/* Company Selection */}
                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Company *</label>
                            <select
                                value={bulkBrandForm.company}
                                onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, company: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a company</option>
                                {availableCompanies.map((company) => (
                                    <option key={company} value={company}>
                                        {company}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {showGroupFields && (
                            <>
                                {/* Group + Brand Input */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Paste (Group + Brand) *</label>
                                    <textarea
                                        placeholder="Paste 2 columns from Excel (Group Number and Brand Name)"
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                        value={bulkBrandForm.brandNames}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            const parsed = parseGroupAndBrandColumns(raw);

                                            setBulkBrandForm({
                                                ...bulkBrandForm,
                                                brandNames: raw,
                                                groupNumber: parsed.groupNumbers.join('\n'),
                                                groupName: parsed.brandNames.join('\n'),
                                            });
                                        }}
                                    />
                                    <p className="mt-1 text-[9px] text-gray-400">Paste rows like: GroupNumber[TAB]BrandName</p>
                                </div>

                                {/* Group Numbers and Brand Names */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Group Numbers *</label>
                                        <textarea
                                            placeholder="Paste Group Numbers"
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                            value={bulkBrandForm.groupNumber || ''}
                                            onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, groupNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Brand Names *</label>
                                        <textarea
                                            placeholder="Paste Brand Names"
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                            value={bulkBrandForm.groupName || ''}
                                            onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, groupName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* RM and AM Selection */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-700 mb-1">RM Email</label>
                                        <select
                                            value={bulkBrandForm.rmEmail || ''}
                                            onChange={(e) => handleRmChange(e.target.value)}
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select RM</option>
                                            {rmUsers.map((u) => (
                                                <option key={u.id} value={u.email}>
                                                    {u.name || u.email} ({u.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-700 mb-1">AM Email</label>
                                        <select
                                            value={bulkBrandForm.amEmail || ''}
                                            onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, amEmail: e.target.value })}
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select AM</option>
                                            {filteredAmUsers.map((u) => (
                                                <option key={u.id} value={u.email}>
                                                    {u.name || u.email} ({u.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {!showGroupFields && (
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Brand Names *</label>
                                <textarea
                                    placeholder="Enter brand names (comma or new line separated)"
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                    value={bulkBrandForm.brandNames}
                                    onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, brandNames: e.target.value })}
                                />
                                <p className="mt-1 text-[9px] text-gray-400">Separate brand names with commas or new lines</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Compact */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-1.5">
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                    Adding...
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" />
                                    Add Brands
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkAddBrandsModal;