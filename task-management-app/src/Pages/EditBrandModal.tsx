import React, { useState, useEffect } from 'react';
import { X, Edit, Check, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Brand } from '../Types/Types';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

interface EditBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (brandData: { name: string; company?: string }) => Promise<void>;
    brand: Brand | null;
}

const EditBrandModal: React.FC<EditBrandModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    brand,
}) => {
    const [brandName, setBrandName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setBrandName(brand?.name || '');
    }, [brand]);

    useEffect(() => {
        if (!isOpen) {
            setBrandName('');
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const validateForm = () => {
        if (!brandName.trim()) {
            setError('Brand name is required');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!brand) {
            toast.error('No brand selected');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const brandData = {
                name: brandName.trim(),
                company: brand.company || '',
            };

            await onUpdate(brandData);
            onClose();
        } catch (error: any) {
            console.error('Error updating brand:', error);
            toast.error(error?.message || 'Failed to update brand');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700 border border-green-200';
            case 'inactive':
                return 'bg-gray-100 text-gray-700 border border-gray-200';
            default:
                return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header - Compact */}
                <div className={`px-4 py-3 border-b border-gray-100 bg-[${theme.primaryUltralight}]`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                <Edit className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Edit Brand</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    Update brand name
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Form Content - Compact */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    <div className="px-4 py-4 overflow-y-auto flex-1">
                        <div className="space-y-4">
                            {/* Brand Name Input */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    Brand Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter brand name"
                                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                        error ? 'border-red-500' : 'border-gray-200 focus:border-transparent'
                                    }`}
                                    value={brandName}
                                    onChange={(e) => {
                                        setBrandName(e.target.value);
                                        if (error) setError('');
                                    }}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                                {error && (
                                    <p className="mt-1 text-[10px] text-red-600 flex items-center gap-1">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </p>
                                )}
                                <p className="mt-1 text-[9px] text-gray-400">
                                    Company: <span className="font-medium text-gray-600">{brand?.company || 'Not specified'}</span>
                                </p>
                            </div>

                            {/* Current Information Card - Compact */}
                            <div className={`bg-[${theme.primaryUltralight}] p-3 rounded-lg border border-[${theme.primaryLight}]/30`}>
                                <h4 className="text-[11px] font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    Current Information
                                </h4>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Current Name:</span>
                                        <span className="font-medium text-gray-800 truncate max-w-[180px]">{brand?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Company:</span>
                                        <span className="font-medium text-gray-800 truncate max-w-[180px]">{brand?.company || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Status:</span>
                                        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${getStatusBadge(brand?.status || 'active')}`}>
                                            {brand?.status || 'active'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Compact */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !brandName.trim()}
                                className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${
                                    isSubmitting || !brandName.trim()
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                                }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-1.5">
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                        Updating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <Check className="h-3 w-3" />
                                        Update Brand
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBrandModal;