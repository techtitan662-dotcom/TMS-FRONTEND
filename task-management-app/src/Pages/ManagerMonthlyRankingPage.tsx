import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Star, CheckCircle, Users, Download, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';

import type { UserType } from '../Types/Types';
import { managerMonthlyRankingService, type ManagerMonthlyRankingResponse, type ManagerMonthlyRankingRow } from '../Services/ManagerMonthlyRanking.service';
import { toAvatarUrl } from '../utils/avatar';

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
                style: { borderRadius: '16px' },
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

    return (
        <div className="space-y-5">
            {/* Month Selector */}
            <div className="flex justify-end">
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white" />
                    <input
                        type="month"
                        value={monthKey || ''}
                        onChange={(e) => setMonthKey(e.target.value)}
                        className="pl-9 pr-3 py-2 text-sm rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                        disabled={loading || saving}
                    />
                </div>
            </div>

            {/* MAIN CARD - Premium Dark Blue Design */}
            <div ref={cardRef} className="relative overflow-hidden rounded-xl shadow-lg border border-white/20 bg-white">
                {/* Dark Blue Gradient Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                            linear-gradient(
                                135deg,
                                #0f2a6e 0%,
                                #1e3a8a 25%,
                                #3b5cae 45%,
                                #3b5cae 55%,
                                #1e3a8a 75%,
                                #0f2a6e 100%
                            )
                        `,
                    }}
                />

                {/* Soft Pattern Overlay */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Content */}
                <div className="relative p-6">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                                {formatMonthLabel(monthKey)}
                            </p>
                            <h3 className="text-base font-bold text-white">HM Square Solution LLP</h3>
                        </div>
                        <button
                            type="button"
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all border border-white/30 shadow-sm download-btn-to-hide"
                            title="Download Card"
                            onClick={downloadCard}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Main Grid */}
                    <div className="grid lg:grid-cols-2 gap-6 items-center">
                        {/* Left Column */}
                        <div className="space-y-5">
                            {/* Name & Performance */}
                            <div>
                                <div className="mb-1">
                                    <span className="text-xs uppercase tracking-wide text-white/70 font-semibold block">
                                        Welcome!
                                    </span>
                                    <h1 className="text-2xl lg:text-3xl font-extrabold drop-shadow-sm">
                                        <span className="text-white">Congratulations </span>
                                        <span className="text-white/90 px-1 inline-block">
                                            {computedRows.length > 0 ? topRow?.name : 'No data available'}
                                        </span>
                                    </h1>
                                </div>
                                <p className="text-xs font-medium text-white/70 mb-2">{topRow?.email || ''}</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-3.5 w-3.5 ${i < Math.floor((topRow?.percent || 0) / 20)
                                                        ? 'text-amber-300 fill-amber-300'
                                                        : 'text-white/30'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-medium text-white/80">
                                            ({topRow?.percentLabel || '0.0%'})
                                        </span>
                                    </div>
                                    <div className="h-1 w-1 bg-white/30 rounded-full" />
                                    <div className="flex items-center gap-1 text-xs text-white/80">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Verified Performance</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quote */}
                            <p
                                className="text-white/80 text-xs border-l-2 pl-3 italic leading-relaxed"
                                style={{ borderLeftColor: 'white', borderLeftWidth: '2px' }}
                            >
                                {computedRows.length > 0 && topRow ? `"Exceptional achievement with ${topRow.percentLabel} target completion"` : '"No data available"'}
                            </p>

                            {/* Performance Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] text-white/70 font-semibold mb-1">Assigned Tasks</p>
                                    <p className="text-sm font-bold text-white">{computedRows.length > 0 && topRow ? topRow.assign : 0}</p>
                                </div>
                                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] text-white/70 font-semibold mb-1">Achieved Tasks</p>
                                    <p className="text-sm font-bold text-white">{computedRows.length > 0 && topRow ? topRow.achieved : 0}</p>
                                </div>
                            </div>

                            {/* Company Info */}
                            {data?.companyName && (
                                <div className="text-[10px] text-white/60">
                                    Company: <span className="font-semibold text-white/80">{data.companyName}</span>
                                    {data?.updatedAt && (
                                        <span>
                                            {' '}• Last updated: <span className="font-semibold text-white/80">{new Date(String(data.updatedAt)).toLocaleString()}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column — Profile Image */}
                        <div className="relative flex justify-center lg:justify-end">
                            <div className="relative w-56 h-56 lg:w-64 lg:h-64">
                                {/* Gradient Ring */}
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8), rgba(255,255,255,0.4), white)',
                                        padding: '3px',
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm" />
                                </div>

                                {/* Profile Image Container */}
                                <div className="absolute inset-1.5 rounded-full overflow-hidden border-2 border-white/30">
                                    {toAvatarUrl(topRow?.avatar) ? (
                                        <img
                                            src={toAvatarUrl(topRow?.avatar)}
                                            alt={topRow?.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/20 to-white/10">
                                            <span className="text-white text-4xl font-bold">
                                                {(topRow?.name || 'U').trim().charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Champion Badge */}
                                    <div className="absolute bottom-3 left-0 right-0 text-center">
                                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold border shadow-sm bg-white/20 backdrop-blur-sm border-white/30 text-white">
                                            👑 CHAMPION 👑
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TEAM SECTION - Premium Dark Blue Style */}
            {computedRows.length > 1 && (
                <div className="relative overflow-hidden rounded-xl shadow-md bg-white border border-[#3b82f6]/20">
                    {/* Header */}
                    <div className="relative px-5 py-3 border-b border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-[#3b82f6]/10">
                                    <Users className="h-4 w-4 text-[#3b82f6]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-800">Team Performance Dashboard</h3>
                                    <p className="text-[10px] text-gray-500">Real-time metrics • This month</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-1 rounded-full font-semibold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                                    {computedRows.length} Team Members
                                </span>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => void save()}
                                        disabled={saving || loading}
                                        className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] text-white text-[10px] font-medium hover:bg-[#0f2a6e] disabled:opacity-60 shadow-sm"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team Grid */}
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {computedRows.map((r, index) => {
                                const rank = index + 2;
                                const rankColors = {
                                    2: 'bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a]',
                                    3: 'bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a]',
                                };
                                const rankColor = rank === 2 ? rankColors[2] : rank === 3 ? rankColors[3] : rankColors[2];

                                return (
                                    <div key={r.userId} className="group relative">
                                        <div className="rounded-lg border border-[#3b82f6]/20 p-3 hover:shadow-md hover:border-[#3b82f6] transition-all duration-300 bg-white">
                                            {/* Rank Badge */}
                                            <div
                                                className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${rankColor}`}
                                            >
                                                #{rank}
                                            </div>

                                            <div className="flex items-start gap-2.5">
                                                {/* Avatar */}
                                                <div className="relative">
                                                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#3b82f6]/20">
                                                        {toAvatarUrl(r?.avatar) ? (
                                                            <img
                                                                src={toAvatarUrl(r?.avatar)}
                                                                alt={r.name}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-[#3b82f6]/10">
                                                                <span className="font-bold text-xs text-[#3b82f6]">
                                                                    {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-800 text-xs mb-0.5 truncate">{r.name}</h4>
                                                    <p className="text-[10px] text-gray-500 mb-1.5 truncate">{r.email}</p>

                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <div className="flex items-center gap-0.5">
                                                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                                                            <span className="font-semibold text-gray-700">{r.percentLabel}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-gray-500">{r.percent.toFixed(0)}%</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-bold text-gray-700">{formatNumber(r.assign)}</p>
                                                            <p className="text-[8px] text-gray-400">Assign</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-bold text-gray-700">{formatNumber(r.achieved)}</p>
                                                            <p className="text-[8px] text-gray-400">Achieved</p>
                                                        </div>
                                                    </div>

                                                    {/* Performance tag */}
                                                    <span
                                                        className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-medium mt-1 ${
                                                            r.percent >= 90
                                                                ? 'bg-green-100 text-green-700'
                                                                : r.percent >= 70
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                        }`}
                                                    >
                                                        {r.percent >= 90 ? 'Excellent' : r.percent >= 70 ? 'Good' : 'Improve'}
                                                    </span>

                                                    {/* Editable fields */}
                                                    {canEdit && (
                                                        <div className="mt-1.5 space-y-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[8px] text-gray-400 w-10">Assign:</span>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[9px] bg-white"
                                                                    value={String(r.assign ?? 0)}
                                                                    disabled={saving || loading}
                                                                    onChange={(e) => handleChange(r.userId, 'assign', e.target.value)}
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[8px] text-gray-400 w-10">Achieve:</span>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[9px] bg-white"
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