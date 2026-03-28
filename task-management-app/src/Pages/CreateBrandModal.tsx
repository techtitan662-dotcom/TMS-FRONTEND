import React, { useState } from 'react';
import { X, Upload, Building } from 'lucide-react';
import toast from 'react-hot-toast';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

interface CreateBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (brandData: any) => Promise<void>;
    companies: string[];
}

const CreateBrandModal: React.FC<CreateBrandModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    companies,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        status: 'active' as const,
        website: '',
        logo: null as File | null,
    });
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size should be less than 5MB');
                return;
            }
            setFormData(prev => ({ ...prev, logo: file }));
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await onCreate(formData);
            setFormData({
                name: '',
                company: '',
                status: 'active',
                website: '',
                logo: null,
            });
            setLogoPreview('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-3 py-4">
                {/* Background overlay */}
                <div className="fixed inset-0 transition-opacity bg-black/40" onClick={onClose} />

                {/* Modal - Compact */}
                <div className="inline-block align-bottom bg-white rounded-lg shadow-xl transform transition-all sm:align-middle sm:max-w-md sm:w-full">
                    <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Create New Brand</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Add a new brand to the system</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {/* Logo Upload - Compact */}
                                <div className="flex justify-center">
                                    <div className="relative">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                                        ) : (
                                            <div className={`h-16 w-16 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200`}>
                                                <Building className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                        <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full cursor-pointer shadow-sm hover:bg-blue-700 transition-colors">
                                            <Upload className="h-3 w-3" />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Brand Name */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Brand Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter brand name"
                                    />
                                </div>

                                {/* Company */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Company
                                    </label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        list="companies-list"
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter company name"
                                    />
                                    <datalist id="companies-list">
                                        {companies.map(company => (
                                            <option key={company} value={company} />
                                        ))}
                                    </datalist>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>

                                {/* Website */}
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>

                            {/* Actions - Compact */}
                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${
                                        isLoading
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                                    }`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-1.5">
                                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Creating...
                                        </span>
                                    ) : (
                                        'Create Brand'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBrandModal;