import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

interface BulkBrandAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBulkAdd: (brands: any[]) => Promise<void>;
    companies: string[];
}

const BulkBrandAddModal: React.FC<BulkBrandAddModalProps> = ({
    isOpen,
    onClose,
    onBulkAdd,
    companies,
}) => {
    const [company, setCompany] = useState('');
    const [brandNames, setBrandNames] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!company.trim()) {
            toast.error('Please select or enter a company');
            return;
        }

        if (!brandNames.trim()) {
            toast.error('Please enter at least one brand name');
            return;
        }

        const names = brandNames
            .split(/[,\n]/)
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (names.length === 0) {
            toast.error('No valid brand names found');
            return;
        }

        const brands = names.map(name => ({
            name,
            company: company.trim(),
            status: 'active'
        }));

        setIsSubmitting(true);
        try {
            await onBulkAdd(brands);
            setBrandNames('');
            onClose();
        } catch (error: any) {
            console.error('Bulk add error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden`}>
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
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Company Field */}
                    <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                            Company *
                        </label>
                        <input
                            type="text"
                            list="bulk-companies-list"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent transition-colors`}
                            placeholder="Enter company name"
                            required
                        />
                        <datalist id="bulk-companies-list">
                            {companies.map(c => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>

                    {/* Brand Names Field */}
                    <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                            Brand Names *
                        </label>
                        <textarea
                            value={brandNames}
                            onChange={(e) => setBrandNames(e.target.value)}
                            className={`w-full h-28 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[${theme.primaryLight}] focus:border-transparent transition-colors resize-none text-xs`}
                            placeholder="Enter brand names (comma or new line separated)"
                            required
                        />
                        <p className="mt-1 text-[9px] text-gray-400">
                            Separate brand names with commas or new lines
                        </p>
                    </div>

                    {/* Actions - Compact */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !company.trim() || !brandNames.trim()}
                            className={`flex-[1.5] flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-[${theme.primary}] rounded-lg hover:bg-[${theme.primaryDark}] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm`}
                        >
                            {isSubmitting ? (
                                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Tag className="h-3 w-3" />
                            )}
                            {isSubmitting ? 'Adding...' : 'Add Brands'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkBrandAddModal;