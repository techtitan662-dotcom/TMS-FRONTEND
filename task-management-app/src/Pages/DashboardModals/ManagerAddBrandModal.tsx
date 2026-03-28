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
    managerBrandName: string;
    setManagerBrandName: (next: string) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    onClose: () => void;
};

const ManagerAddBrandModal = ({
    open,
    managerBrandName,
    setManagerBrandName,
    isSubmitting,
    onSubmit,
    onClose,
}: Props) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => {
                    if (!isSubmitting) {
                        onClose();
                    }
                }}
            />

            <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <Tag className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Add Brand</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Enter the brand name to add</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 py-4">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Brand Name
                    </label>
                    <input
                        autoFocus
                        value={managerBrandName}
                        onChange={(e) => setManagerBrandName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isSubmitting) {
                                onSubmit();
                            }
                            if (e.key === 'Escape' && !isSubmitting) {
                                onClose();
                            }
                        }}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter brand name"
                        disabled={isSubmitting}
                    />
                    <p className="mt-1 text-[9px] text-gray-400">
                        Enter a descriptive name for the brand
                    </p>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onSubmit}
                            className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${
                                isSubmitting
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
                                    Add Brand
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerAddBrandModal;