import { Tag, X } from 'lucide-react';

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
    bulkTaskTypeCompany: string;
    setBulkTaskTypeCompany: (next: string) => void;
    bulkTaskTypeNames: string;
    setBulkTaskTypeNames: (next: string) => void;
    availableCompanies: string[];
    onSubmit: () => void;
    isSubmitting: boolean;
};

const BulkAddTaskTypesModal = ({
    open,
    onClose,
    bulkTaskTypeCompany,
    setBulkTaskTypeCompany,
    bulkTaskTypeNames,
    setBulkTaskTypeNames,
    availableCompanies,
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
                                <Tag className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Bulk Add Task Types</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Add multiple task types (comma or new line separated)</p>
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

                {/* Form Content - Compact */}
                <div className="px-4 py-4 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        {/* Company Selection */}
                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                Company *
                            </label>
                            <select
                                value={bulkTaskTypeCompany}
                                onChange={(e) => setBulkTaskTypeCompany(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select a company</option>
                                {availableCompanies.map((company) => (
                                    <option key={company} value={company}>
                                        {company}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Task Types Input */}
                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                Task Types *
                            </label>
                            <textarea
                                placeholder="Enter task types (comma or new line separated)"
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y"
                                value={bulkTaskTypeNames}
                                onChange={(e) => setBulkTaskTypeNames(e.target.value)}
                            />
                            <p className="mt-1 text-[9px] text-gray-400">
                                Example: Bug, Feature or Bug (one per line)
                            </p>
                        </div>
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
                            className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${
                                isSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                            }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-1.5">
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                    Adding Types...
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" />
                                    Add Types
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkAddTaskTypesModal;