import React, { useMemo, useState } from 'react';
import { X, Filter, RefreshCcw } from 'lucide-react';

interface AdvancedFiltersProps {
    filters: {
        status: string;
        priority: string;
        assigned: string;
        date: string;
        taskType: string;
        company: string;
        brand: string;
        rm?: string;
        rmTeam?: string;
        sort?: string;
    };
    availableCompanies: string[];
    availableTaskTypes: string[];
    availableBrands: string[];
    availableRms?: Array<{ id: string; name: string; email: string }>;
    getBrandLabel?: (brandName: string) => string;
    users?: any[];
    currentUser?: { email: string; role: string };
    onFilterChange: (filterType: string, value: string) => void;
    onResetFilters: () => void;
    onApplyFilters?: () => void;
    showFilters: boolean;
    onToggleFilters: () => void;
}

type MultiSelectOption = {
    value: string;
    label: string;
};

function parseMultiValue(value: string): string[] {
    const raw = (value || '').toString().trim();
    if (!raw || raw === 'all') return [];
    return raw
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function serializeMultiValue(values: string[]): string {
    const unique = Array.from(new Set((values || []).map(v => String(v || '').trim()).filter(Boolean)));
    if (unique.length === 0) return 'all';
    return unique.join(',');
}

const MultiSelectFilter: React.FC<{
    label: string;
    placeholder: string;
    value: string;
    options: MultiSelectOption[];
    onChange: (nextValue: string) => void;
}> = ({ label, placeholder, value, options, onChange }) => {
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => new Set(parseMultiValue(value)), [value]);
    const selectedCount = selected.size;

    const displayText = selectedCount === 0
        ? placeholder
        : selectedCount === 1
            ? (options.find(o => selected.has(o.value))?.label || placeholder)
            : `${selectedCount} selected`;

    return (
        <div className="relative">
            <label className="block text-[10px] font-medium text-gray-600 mb-1 uppercase tracking-wide">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] transition-all"
            >
                <span className="truncate block">{displayText}</span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                    <div className="space-y-1.5">
                        {options.map((opt) => {
                            const checked = selected.has(opt.value);
                            return (
                                <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none hover:bg-gray-50 px-1 py-0.5 rounded">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                            const next = new Set(selected);
                                            if (e.target.checked) next.add(opt.value);
                                            else next.delete(opt.value);
                                            onChange(serializeMultiValue(Array.from(next)));
                                        }}
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                                    />
                                    <span className="truncate">{opt.label}</span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-2 flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => onChange('all')}
                            className="px-2 py-1 text-[10px] border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-2 py-1 text-[10px] bg-[#3b82f6] text-white rounded-md hover:bg-[#1e3a8a] transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
    filters,
    availableCompanies,
    availableTaskTypes,
    availableBrands,
    availableRms,
    getBrandLabel,
    users,
    currentUser,
    onFilterChange,
    onResetFilters,
    onApplyFilters,
    showFilters,
    onToggleFilters,
}) => {
    if (!showFilters) return null;

    const roleKey = (currentUser?.role || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

    const canSeeCompanyFilter = roleKey === 'admin' || roleKey === 'super_admin';

    const formatLabel = (value: string) => {
        const v = (value || '').toString();
        if (!v) return v;
        const trimmed = v.trim();
        if (!trimmed) return trimmed;
        const hasUpper = /[A-Z]/.test(trimmed);
        if (hasUpper) return trimmed;
        return trimmed
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatBrandOptionLabel = (brand: string) => {
        if (typeof getBrandLabel === 'function') {
            const label = getBrandLabel(brand);
            if (label) return label;
        }
        return formatLabel(brand);
    };

    const getActiveFilterCount = () => {
        let count = 0;
        Object.entries(filters).forEach(([key, value]) => {
            if (key === 'brand') return;
            if (key === 'company' && !canSeeCompanyFilter) return;
            if (key === 'rm' && roleKey !== 'sbm') return;
            if (value !== 'all') count++;
        });
        return count;
    };

    const activeFilterCount = getActiveFilterCount();

    const normalizeText = (value: unknown): string => {
        return (value == null ? '' : String(value)).trim().toLowerCase();
    };

    const handleRmChange = (nextRmEmail: string) => {
        const email = normalizeText(nextRmEmail);
        if (!email || email === 'all') {
            onFilterChange('rm', 'all');
            onFilterChange('rmTeam', '');
            return;
        }

        const list: any[] = Array.isArray(users) ? users : [];
        const selectedRmDoc: any = list.find((u: any) => normalizeText(u?.email) === email);
        const selectedRmId = String(selectedRmDoc?.id || selectedRmDoc?._id || '').trim();
        const teamEmails = selectedRmId
            ? list
                .filter((u: any) => String(u?.managerId || '').trim() === selectedRmId)
                .map((u: any) => normalizeText(u?.email))
                .filter(Boolean)
            : [];

        const allowedAssignees = [email, ...teamEmails].filter(Boolean);

        onFilterChange('rm', email);
        onFilterChange('rmTeam', allowedAssignees.join(','));
    };

    return (
        <div className="mt-3 mb-5 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#3b82f6]" />
                    <h3 className="text-sm font-semibold text-gray-800">Advanced Filters</h3>
                    {activeFilterCount > 0 && (
                        <span className="bg-[#3b82f6]/10 text-[#3b82f6] text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onResetFilters}
                        className="text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                    >
                        <RefreshCcw className="h-3 w-3" />
                        Clear all
                    </button>
                    <button
                        onClick={onToggleFilters}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {/* Status Filter */}
                <MultiSelectFilter
                    label="Status"
                    placeholder="All"
                    value={filters.status}
                    onChange={(v) => onFilterChange('status', v)}
                    options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'in-progress', label: 'In Progress' },
                        { value: 'reassigned', label: 'Reassigned' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'unapproval', label: 'Unapproval' },
                    ]}
                />

                {/* Priority Filter */}
                <MultiSelectFilter
                    label="Priority"
                    placeholder="All"
                    value={filters.priority}
                    onChange={(v) => onFilterChange('priority', v)}
                    options={[
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                    ]}
                />

                {/* Assigned Filter */}
                <MultiSelectFilter
                    label="Assigned"
                    placeholder="Everyone"
                    value={filters.assigned}
                    onChange={(v) => onFilterChange('assigned', v)}
                    options={[
                        { value: 'assigned-to-me', label: 'To Me' },
                        { value: 'assigned-by-me', label: 'By Me' },
                    ]}
                />

                {/* Due Date Filter */}
                <MultiSelectFilter
                    label="Due Date"
                    placeholder="All"
                    value={filters.date}
                    onChange={(v) => onFilterChange('date', v)}
                    options={[
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'This Week' },
                        { value: 'overdue', label: 'Overdue' },
                    ]}
                />

                {/* Task Type Filter */}
                <MultiSelectFilter
                    label="Type"
                    placeholder="All"
                    value={filters.taskType}
                    onChange={(v) => onFilterChange('taskType', v)}
                    options={availableTaskTypes.map((typeName) => ({
                        value: typeName,
                        label: typeName,
                    }))}
                />

                {canSeeCompanyFilter && (
                    <MultiSelectFilter
                        label="Company"
                        placeholder="All"
                        value={filters.company}
                        onChange={(v) => onFilterChange('company', v)}
                        options={availableCompanies.map((companyName) => ({
                            value: companyName,
                            label: companyName,
                        }))}
                    />
                )}

                {/* Brand Filter */}
                <MultiSelectFilter
                    label="Brand"
                    placeholder="All"
                    value={filters.brand}
                    onChange={(v) => onFilterChange('brand', v)}
                    options={availableBrands.map((brand) => ({
                        value: brand,
                        label: formatBrandOptionLabel(brand),
                    }))}
                />

                {roleKey === 'sbm' && availableRms && (
                    <MultiSelectFilter
                        label="RM"
                        placeholder="All"
                        value={normalizeText((filters as any).rm || '') || 'all'}
                        onChange={(v) => handleRmChange(v)}
                        options={(availableRms || []).map((rm) => ({
                            value: normalizeText(rm.email),
                            label: rm.name || rm.email,
                        }))}
                    />
                )}

                {/* Sort Filter */}
                <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1 uppercase tracking-wide">
                        Sort By
                    </label>
                    <select
                        value={filters.sort || 'desc'}
                        onChange={(e) => onFilterChange('sort', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] transition-all"
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                {onApplyFilters ? (
                    <button
                        onClick={onApplyFilters}
                        className="px-3 py-1.5 text-xs font-medium bg-[#3b82f6] text-white rounded-lg hover:bg-[#1e3a8a] transition-all"
                    >
                        Apply Filters
                    </button>
                ) : (
                    <button
                        onClick={onResetFilters}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                    >
                        Reset Filters
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdvancedFilters;