import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Star, CheckCircle, Users, Download, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';

import type { UserType } from '../Types/Types';
import { managerMonthlyRankingService, type ManagerMonthlyRankingResponse, type ManagerMonthlyRankingRow } from '../Services/ManagerMonthlyRanking.service';
import { toAvatarUrl } from '../utils/avatar';
import logo from '../../public/logo (2).png';
import cardBg from '../../public/Marble Iphone Wallpaper • The Best Marble Backgrounds.jpg.jpeg';

const ALLOWED_MARKETER_MANAGER_EMAILS = new Set([
    'drashtismartbiz@gmail.com',
    'krunalsmartbiz@gmail.com',
    'harshsmartbiz@gmail.com'
].map((e) => e.trim().toLowerCase()));

const pad2 = (n: number) => String(n).padStart(2, '0');
const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const toNumberSafe = (v: unknown): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n;
};

const clampNonNegativeInt = (n: number): number => {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
};

const normalizeEmailKey = (v: unknown): string => String(v || '').trim().toLowerCase();

const calcPercent = (assign: number, achieved: number): number => {
    if (assign <= 0) return 0;
    const pct = (achieved / assign) * 100;
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, pct);
};

const ManagerMonthlyRankingPage = ({ currentUser }: { currentUser: UserType }) => {
    const roleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser]);
    const canEdit = useMemo(() => roleKey === 'md_manager', [roleKey]);

    const [monthKey, setMonthKey] = useState<string>(() => monthKeyOfDate(new Date()));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [data, setData] = useState<ManagerMonthlyRankingResponse | null>(null);
    const [rowsDraft, setRowsDraft] = useState<ManagerMonthlyRankingRow[]>([]);
    const cardRef = useRef<HTMLDivElement>(null);

    const downloadCard = async () => {
        if (!cardRef.current) {
            toast.error('Card element not found');
            return;
        }
        const toastId = toast.loading('Preparing download...');
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: 'white',
                style: { borderRadius: '20px' },
                filter: (node) => {
                    const exclusionClasses = ['download-btn-to-hide'];
                    return !exclusionClasses.some(cls => (node as HTMLElement).classList?.contains(cls));
                }
            });
            const link = document.createElement('a');
            const fileName = `performance-card-${topRow?.name?.replace(/\s+/g, '-') || 'employee'}-${monthKey}.png`;
            link.download = fileName;
            link.href = dataUrl;
            link.click();
            toast.success('Downloaded successfully', { id: toastId });
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download card', { id: toastId });
        }
    };

    const fetchMonthly = useCallback(async () => {
        setLoading(true);
        try {
            const res = await managerMonthlyRankingService.getMonthlyRanking(monthKey);
            if (!res?.success || !res.data) {
                setData(null);
                setRowsDraft([]);
                return;
            }
            setData(res.data);
            setRowsDraft(res.data.rows || []);
        } catch (err) {
            console.error('fetchMonthly error:', err);
        } finally {
            setLoading(false);
        }
    }, [monthKey]);

    useEffect(() => {
        void fetchMonthly();
    }, [fetchMonthly]);

    const computedRows = useMemo(() => {
        const list = Array.isArray(rowsDraft) ? rowsDraft : [];
        const filtered = list.filter((r) => {
            const email = normalizeEmailKey((r as any).email);
            const role = normalizeRoleKey((r as any).role);
            return ALLOWED_MARKETER_MANAGER_EMAILS.has(email) || role === 'marketer_manager';
        });
        const mapped = filtered.map((r) => {
            const assign = clampNonNegativeInt(toNumberSafe((r as any).assign));
            const achieved = clampNonNegativeInt(toNumberSafe((r as any).achieved));
            const percent = calcPercent(assign, achieved);
            return {
                ...r,
                assign,
                achieved,
                percent,
                percentLabel: `${percent.toFixed(1)}%`
            };
        });
        mapped.sort((a, b) => (b.percent - a.percent) || (b.achieved - a.achieved) || (a.name || '').localeCompare(b.name || ''));
        return mapped;
    }, [rowsDraft]);

    const topRow = useMemo(() => computedRows[0] || null, [computedRows]);

    const handleChange = useCallback((userId: string, field: 'assign' | 'achieved', value: string) => {
        setRowsDraft((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((r) => {
                if (String((r as any).userId) !== String(userId)) return r;
                const currentAssign = clampNonNegativeInt(toNumberSafe((r as any).assign));
                const currentAchieved = clampNonNegativeInt(toNumberSafe((r as any).achieved));
                if (field === 'assign') {
                    const nextAssign = clampNonNegativeInt(toNumberSafe(value));
                    const nextAchieved = Math.min(currentAchieved, nextAssign);
                    return { ...r, assign: nextAssign, achieved: nextAchieved } as any;
                }
                const nextAchievedRaw = clampNonNegativeInt(toNumberSafe(value));
                const nextAchieved = Math.min(nextAchievedRaw, currentAssign);
                return { ...r, achieved: nextAchieved } as any;
            });
        });
    }, []);

    const save = useCallback(async () => {
        if (!canEdit) return;
        setSaving(true);
        try {
            const payload = {
                monthKey,
                rows: computedRows.map((r) => ({
                    userId: String(r.userId),
                    assign: clampNonNegativeInt(toNumberSafe(r.assign)),
                    achieved: Math.min(
                        clampNonNegativeInt(toNumberSafe(r.achieved)),
                        clampNonNegativeInt(toNumberSafe(r.assign))
                    )
                }))
            };
            const res = await managerMonthlyRankingService.saveMonthlyRanking(payload);
            if (!res?.success) {
                toast.error(res?.message || 'Failed to save');
                return;
            }
            toast.success('Saved successfully');
            await fetchMonthly();
        } catch (err) {
            console.error('Save error:', err);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    }, [canEdit, computedRows, fetchMonthly, monthKey]);

    const formatMonthLabel = (value?: string): string => {
        const raw = String(value || '').trim();
        const [y, m] = raw.split('-').map((x) => Number(x));
        if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) {
            return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const bgImage = cardBg;

    return (
        <div className="space-y-4 md:space-y-5">
            {/* Month Selector and Download Button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    {/* Empty div for spacing if needed */}
                </div>
                <div className="flex items-center">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="month"
                            value={monthKey || ''}
                            onChange={(e) => setMonthKey(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white/80 text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 backdrop-blur-sm"
                            disabled={loading || saving}
                        />
                    </div>
                    <button
                        type="button"
                        className="ml-3 md:ml-5 p-2 rounded-lg bg-white/50 text-blue-700 hover:bg-white/70 transition-all border border-blue-300 shadow-sm download-btn-to-hide"
                        title="Download Card"
                        onClick={downloadCard}
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* MAIN CARD - With Background Image */}
            <div
                ref={cardRef}
                className="relative overflow-hidden rounded-2xl shadow-md"
                style={{
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    minHeight: 'auto',
                }}
            >
                {/* Overlay to make content readable */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, rgba(230,240,250,0.85) 0%, rgba(204,228,248,0.85) 25%, rgba(179,215,245,0.85) 50%, rgba(153,201,242,0.85) 75%, rgba(128,187,240,0.85) 100%)',
                    }}
                />

                {/* Top Full Width Confetti Image */}
                <div
                    className="absolute top-0 left-0 right-0 z-[5] overflow-hidden rounded-t-2xl"
                    style={{
                        height: '150px',
                        backgroundImage: `url('/image (1).png')`,
                        backgroundRepeat: 'repeat-x',
                        backgroundPosition: 'top left',
                        backgroundSize: 'auto 150px',
                    }}
                />

                {/* Content */}
                <div className="relative p-4 md:p-6 pt-16 md:pt-20 lg:pt-24">
                    {/* Top Bar - Mobile: Logo Right, Desktop: Logo Center */}
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        {/* Left side text */}
                        <div>
                            <p className="text-[10px] md:text-xs font-bold text-[#0f2a6e] tracking-wider">
                                {formatMonthLabel(monthKey)}
                            </p>
                            <h3 className="text-sm md:text-xl font-bold text-[#0f2a6e]">Marketer of the month</h3>
                        </div>
                        {/* Logo - Mobile me visible, Desktop me hidden */}
                        <div className="flex-shrink-0 md:hidden">
                            <img src={logo} alt="logo" className="h-24 w-auto opacity-90" />
                        </div>
                        {/* Desktop me empty div for spacing */}
                        <div className="hidden md:block w-12 md:w-16"></div>
                    </div>

                    {/* Desktop Logo - Center */}
                    <div className="hidden md:flex absolute top-4 left-0 right-0 justify-center pointer-events-none">
                        <img src={logo} alt="logo" className="h-40 w-auto opacity-90" />
                    </div>

                    {/* Main Grid - Responsive column layout */}
                    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6 items-center">
                        {/* Left Column */}
                        <div className="space-y-3 md:space-y-5 w-full px-2 md:px-0 order-1">
                            {/* Name & Performance */}
                            <div>
                                <div className="flex flex-col sm:flex-row flex-wrap gap-1 sm:gap-2 items-start sm:items-baseline mb-2">
                                    <span
                                        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight"
                                        style={{
                                            color: "#0f2a6e",
                                            WebkitTextStroke: "0.5px #daa520",
                                            paintOrder: "stroke fill",
                                            fontFamily: "'Anek Telugu', serif",
                                            fontWeight: "700",
                                            letterSpacing: "0.5px"
                                        }}
                                    >
                                        Congratulations
                                    </span>
                                    <span
                                        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight break-words"
                                        style={{
                                            color: "#0f2a6e",
                                            WebkitTextStroke: "0.5px #daa520",
                                            paintOrder: "stroke fill",
                                            fontFamily: "'Anek Telugu', serif",
                                            fontWeight: "700",
                                            letterSpacing: "0.5px"
                                        }}
                                    >
                                        {computedRows.length > 0 ? topRow?.name : 'No data available'}
                                    </span>
                                </div>
                                <p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-2 break-all">{topRow?.email || ''}</p>
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${i < Math.floor((topRow?.percent || 0) / 20)
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-gray-300'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                                            ({topRow?.percentLabel || '0.0%'})
                                        </span>
                                    </div>
                                    <div className="h-1 w-1 bg-gray-300 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-600">
                                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
                                        <span>Verified Performance</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quote */}
                            <p
                                className="text-gray-700 text-[10px] sm:text-xs border-l-3 pl-2 italic leading-relaxed bg-white/50 p-2 rounded-sm inline-block w-auto"
                                style={{ borderLeftColor: '#3b82f6', borderLeftWidth: '3px' }}
                            >
                                {computedRows.length > 0 && topRow
                                    ? `"Exceptional achievement with ${topRow.percentLabel} target completion"`
                                    : '"No data available"'}
                            </p>

                            {/* Performance Stats */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-[300px] sm:max-w-[400px]">
                                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                                    <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Assigned Tasks</p>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-800">{computedRows.length > 0 && topRow ? formatNumber(topRow.assign) : 0}</p>
                                </div>
                                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                                    <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Achieved Tasks</p>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-800">{computedRows.length > 0 && topRow ? formatNumber(topRow.achieved) : 0}</p>
                                </div>
                            </div>

                            {/* Company Info */}
                            {data?.companyName && (
                                <div className="text-[8px] sm:text-[9px] text-gray-500">
                                    Company: <span className="font-semibold text-gray-700">{data.companyName}</span>
                                    {data?.updatedAt && (
                                        <span className="block sm:inline sm:ml-1">
                                            {' '}• Last updated: <span className="font-semibold text-gray-700">{new Date(String(data.updatedAt)).toLocaleString()}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Profile Image */}
                        <div className="relative flex justify-center w-full mt-4 lg:mt-0 order-2">
                            <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72">
                                {/* Gradient Ring */}
                                <div
                                    className="absolute inset-0 rounded-full z-[2]"
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #1e40af, #2563eb, #1e3a8a, #3b82f6)',
                                        padding: '3px',
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-white" />
                                </div>

                                {/* Profile Image Container */}
                                <div className="absolute inset-1 z-[3]">
                                    {toAvatarUrl(topRow?.avatar) ? (
                                        <img
                                            src={toAvatarUrl(topRow?.avatar)}
                                            alt={topRow?.name}
                                            className="w-full h-full object-cover rounded-full border border-blue-200"
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                                            <span className="text-blue-600 text-4xl sm:text-5xl font-bold">
                                                {(topRow?.name || 'U').trim().charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Champion Badge */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] sm:w-[75%] z-[5]">
                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                                            <div className="relative px-2 sm:px-3 py-1.5 rounded-full bg-white border border-blue-100 shadow-md">
                                                <div className="text-[9px] sm:text-[13px] font-extrabold text-[#1e3a8a] tracking-wide uppercase text-center whitespace-nowrap sm:whitespace-nowrap">
                                                    Marketer of the month
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom padding */}
                    <div className="h-4 md:h-6"></div>
                </div>
            </div>

            {/* TEAM SECTION - Responsive */}
            {computedRows.length > 1 && (
                <div className="relative overflow-hidden rounded-xl shadow-sm bg-white border border-blue-200">
                    {/* Header */}
                    <div className="relative px-4 py-3 sm:px-5 sm:py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50/50 to-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
                                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm sm:text-base text-gray-800">Team Performance Dashboard</h3>
                                    <p className="text-[10px] sm:text-xs text-gray-500">Real-time metrics • {formatMonthLabel(monthKey)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                    {computedRows.length} Team Members
                                </span>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => void save()}
                                        disabled={saving || loading}
                                        className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-blue-600 text-white text-[10px] sm:text-xs font-medium hover:bg-blue-700 disabled:opacity-60 shadow-sm transition-all"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team Grid */}
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {computedRows.slice(1).map((r, index) => {
                                const rank = index + 2;
                                const isEvenIndex = (index % 2 === 0);
                                const cardBgClass = isEvenIndex ? 'bg-blue-50/50' : 'bg-white';
                                const rankColors = {
                                    2: 'bg-gradient-to-r from-blue-500 to-blue-600',
                                    3: 'bg-gradient-to-r from-blue-500 to-blue-600',
                                    4: 'bg-gradient-to-r from-blue-500 to-blue-600',
                                };
                                const rankColor = rank === 2 ? rankColors[2] : rank === 3 ? rankColors[3] : rankColors[4];

                                return (
                                    <div key={r.userId} className="group relative">
                                        <div className={`rounded-lg border border-blue-200 p-3 sm:p-4 hover:shadow-md hover:border-blue-300 transition-all duration-300 ${cardBgClass}`}>
                                            {/* Rank Badge */}
                                            <div
                                                className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-sm ${rankColor}`}
                                            >
                                                #{rank}
                                            </div>

                                            <div className="flex items-start gap-2 sm:gap-3">
                                                {/* Avatar */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-blue-200 bg-white">
                                                        {toAvatarUrl(r?.avatar) ? (
                                                            <img
                                                                src={toAvatarUrl(r?.avatar)}
                                                                alt={r.name}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                                                <span className="font-bold text-xs sm:text-sm text-blue-600">
                                                                    {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border border-white" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-800 text-xs sm:text-sm mb-0.5 truncate">{r.name}</h4>
                                                    <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2 truncate">{r.email}</p>

                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-wrap">
                                                        <div className="flex items-center gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${i < Math.floor(r.percent / 20)
                                                                        ? 'text-blue-500 fill-blue-500'
                                                                        : i < r.percent / 20
                                                                            ? 'text-blue-400 fill-blue-400'
                                                                            : 'text-gray-300 fill-none'
                                                                        }`}
                                                                />
                                                            ))}
                                                            <span className="font-medium text-gray-700 ml-0.5 sm:ml-1 text-[10px] sm:text-xs">{r.percentLabel}</span>
                                                        </div>
                                                        <span className="text-gray-500 text-[10px] sm:text-xs">{r.percent.toFixed(0)}%</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <div>
                                                            <p className="text-[8px] sm:text-[9px] text-gray-400">Assign</p>
                                                            <p className="text-[10px] sm:text-xs font-semibold text-gray-800">{formatNumber(r.assign)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] sm:text-[9px] text-gray-400">Achieved</p>
                                                            <p className="text-[10px] sm:text-xs font-semibold text-gray-800">{formatNumber(r.achieved)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Performance tag */}
                                                    <span
                                                        className={`inline-block text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-medium mt-1 ${r.percent >= 90
                                                                ? 'bg-green-100 text-green-700'
                                                                : r.percent >= 70
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                    >
                                                        {r.percent >= 90 ? 'Excellent' : r.percent >= 70 ? 'Good' : 'Needs Improvement'}
                                                    </span>

                                                    {/* Editable fields */}
                                                    {canEdit && (
                                                        <div className="mt-2 pt-2 border-t border-blue-100 space-y-1.5">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[8px] sm:text-[9px] text-gray-500 w-10 sm:w-12">Assign:</span>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    className="w-14 sm:w-16 px-1.5 py-0.5 border border-blue-200 rounded text-[9px] sm:text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                                    value={String(r.assign ?? 0)}
                                                                    disabled={saving || loading}
                                                                    onChange={(e) => handleChange(r.userId, 'assign', e.target.value)}
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[8px] sm:text-[9px] text-gray-500 w-10 sm:w-12">Achieve:</span>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    className="w-14 sm:w-16 px-1.5 py-0.5 border border-blue-200 rounded text-[9px] sm:text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                                    value={String(r.achieved ?? 0)}
                                                                    disabled={saving || loading}
                                                                    onChange={(e) => handleChange(r.userId, 'achieved', e.target.value)}
                                                                    min={0}
                                                                    max={r.assign ?? 0}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerMonthlyRankingPage;