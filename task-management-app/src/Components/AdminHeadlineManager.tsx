import React, { useState, useEffect } from 'react';
import { Settings, Send, Trash2, Loader2, Calendar, Star, Bell, Megaphone } from 'lucide-react';
import { headlineService } from '../Services/Headline.service';
import type { Headline } from '../Services/Headline.service';
import toast from 'react-hot-toast';

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

const AdminHeadlineManager: React.FC = () => {
    const [text, setText] = useState('');
    const [type, setType] = useState<Headline['type']>('update');
    const [expiresAt, setExpiresAt] = useState('');
    const [bgColor, setBgColor] = useState('');
    const [textColor, setTextColor] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeHeadline, setActiveHeadline] = useState<Headline | null>(null);

    const fetchActive = async () => {
        const res = await headlineService.getActiveHeadline();
        if (res.success) {
            setActiveHeadline(res.data);
            if (res.data) {
                setText(res.data.text);
                setType(res.data.type);
                setExpiresAt(res.data.expiresAt ? new Date(res.data.expiresAt).toISOString().slice(0, 16) : '');
                setBgColor(res.data.bgColor || '');
                setTextColor(res.data.textColor || '');
            }
        }
    };

    useEffect(() => {
        fetchActive();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setIsLoading(true);
        const res = await headlineService.createHeadline({
            text: text.trim(),
            type,
            expiresAt: expiresAt || undefined,
            bgColor: bgColor || undefined,
            textColor: textColor || undefined
        });
        setIsLoading(false);

        if (res.success) {
            toast.success('Headline updated successfully!');
            fetchActive();
        } else {
            toast.error(res.message || 'Failed to update headline');
        }
    };

    const handleDeactivate = async () => {
        setIsLoading(true);
        const res = await headlineService.deactivateHeadline();
        setIsLoading(false);

        if (res.success) {
            toast.success('Headline removed');
            setText('');
            setExpiresAt('');
            setBgColor('');
            setTextColor('');
            setActiveHeadline(null);
        } else {
            toast.error(res.message || 'Failed to remove headline');
        }
    };

    const getPreviewIcon = () => {
        switch (type) {
            case 'holiday': return <Calendar className="h-3 w-3" />;
            case 'festival': return <Star className="h-3 w-3" />;
            case 'meeting': return <Bell className="h-3 w-3" />;
            default: return <Megaphone className="h-3 w-3" />;
        }
    };

    const getPreviewBgStyle = () => {
        if (bgColor) return { backgroundColor: bgColor };
        switch (type) {
            case 'holiday': return { backgroundImage: 'linear-gradient(to right, #16a34a, #047857)' };
            case 'festival': return { backgroundImage: 'linear-gradient(to right, #9333ea, #4338ca)' };
            case 'meeting': return { backgroundImage: 'linear-gradient(to right, #2563eb, #4338ca)' };
            case 'update': return { backgroundImage: 'linear-gradient(to right, #f97316, #dc2626)' };
            default: return { backgroundImage: `linear-gradient(to right, ${theme.primary}, ${theme.primaryDark})` };
        }
    };

    const getPreviewTextStyle = () => {
        if (textColor) return { color: textColor };
        return { color: 'white' };
    };

    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 max-w-2xl mx-auto`}>
            <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 bg-[${theme.primaryUltralight}] text-[${theme.primary}] rounded-lg`}>
                    <Settings className="h-4 w-4" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-900">Announcement Headline</h2>
                    <p className="text-[10px] text-gray-500">Manage the scrolling announcement visible to all users</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Preview Section - Compact */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-gray-700">Live Preview</label>
                    <div
                        className="relative overflow-hidden rounded-lg shadow-sm py-2 border border-white/20 transition-all duration-300"
                        style={getPreviewBgStyle()}
                    >
                        <style>{`
                            @keyframes preview-marquee-compact {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .animate-preview-marquee-compact {
                                animation: preview-marquee-compact 20s linear infinite;
                            }
                        `}</style>

                        <div className="flex items-center gap-2">
                            <div
                                className="flex-shrink-0 bg-white/20 p-1 ml-3 rounded backdrop-blur-sm z-10"
                                style={getPreviewTextStyle()}
                            >
                                {getPreviewIcon()}
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className="whitespace-nowrap inline-flex animate-preview-marquee-compact items-center">
                                    <span
                                        className="flex items-center gap-4 pr-4 font-semibold text-[11px] tracking-wide"
                                        style={getPreviewTextStyle()}
                                    >
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <React.Fragment key={i}>
                                                <span>{text || 'Headline text will appear here...'}</span>
                                                <span className="opacity-40 select-none">•</span>
                                            </React.Fragment>
                                        ))}
                                    </span>
                                    <span
                                        className="flex items-center gap-4 pr-4 font-semibold text-[11px] tracking-wide"
                                        style={getPreviewTextStyle()}
                                    >
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <React.Fragment key={i}>
                                                <span>{text || 'Headline text will appear here...'}</span>
                                                <span className="opacity-40 select-none">•</span>
                                            </React.Fragment>
                                        ))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message Input - Compact */}
                <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Headline Message</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full rounded-lg border-gray-200 border p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[70px] resize-y"
                        placeholder="Type holiday, festival, or meeting update here..."
                        required
                    />
                </div>

                {/* Type Buttons - Compact */}
                <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Category</label>
                    <div className="grid grid-cols-5 gap-1.5">
                        {(['update', 'holiday', 'festival', 'meeting', 'other'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`py-1.5 px-2 rounded-lg border text-[10px] font-medium transition-all ${
                                    type === t
                                        ? `bg-[${theme.primary}] border-[${theme.primary}] text-white shadow-sm`
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1).substring(0, 6)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Expiration and Colors - Compact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Expiration (Optional)</label>
                        <input
                            type="datetime-local"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="w-full rounded-lg border-gray-200 border p-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Background</label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="color"
                                    value={bgColor || '#2563eb'}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="h-7 w-full rounded-lg border-gray-200 border p-0.5 cursor-pointer"
                                />
                                {bgColor && (
                                    <button
                                        type="button"
                                        onClick={() => setBgColor('')}
                                        className="text-[9px] text-red-500 hover:underline whitespace-nowrap"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Text Color</label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="color"
                                    value={textColor || '#ffffff'}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="h-7 w-full rounded-lg border-gray-200 border p-0.5 cursor-pointer"
                                />
                                {textColor && (
                                    <button
                                        type="button"
                                        onClick={() => setTextColor('')}
                                        className="text-[9px] text-red-500 hover:underline whitespace-nowrap"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Compact */}
                <div className="flex items-center gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || !text.trim()}
                        className={`flex-1 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 text-[11px] ${
                            isLoading || !text.trim()
                                ? 'bg-gray-300 cursor-not-allowed'
                                : `bg-[${theme.primary}] hover:bg-[${theme.primaryDark}]`
                        }`}
                    >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {activeHeadline ? 'Update' : 'Post'}
                    </button>

                    {activeHeadline && (
                        <button
                            type="button"
                            onClick={handleDeactivate}
                            disabled={isLoading}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all flex-shrink-0"
                            title="Remove headline"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default AdminHeadlineManager;