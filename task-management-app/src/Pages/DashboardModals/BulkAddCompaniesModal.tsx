import { Building, X } from 'lucide-react';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

type Props = {
    open: boolean;
    onClose: () => void;
    bulkCompanyNames: string;
    setBulkCompanyNames: (next: string) => void;
    onSubmit: () => void | Promise<void>;
    isSubmitting: boolean;
};

const BulkAddCompaniesModal = ({
    open,
    onClose,
    bulkCompanyNames,
    setBulkCompanyNames,
    onSubmit,
    isSubmitting,
}: Props) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header - Compact */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <Building className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Bulk Add Companies</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Add multiple companies (comma or new line separated)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form Content - Compact */}
                <div className="px-4 py-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Company Names *</label>
                        <textarea
                            placeholder="Enter company names (comma or new line separated)"
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                            value={bulkCompanyNames}
                            onChange={(e) => setBulkCompanyNames(e.target.value)}
                        />
                        <p className="mt-1 text-[9px] text-gray-400">
                            Example: Company A, Company B or Company A (one per line)
                        </p>
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
                                    <Building className="h-3 w-3" />
                                    Add Companies
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkAddCompaniesModal;