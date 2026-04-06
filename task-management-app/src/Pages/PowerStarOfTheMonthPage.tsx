import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Star, CheckCircle, Users, Trophy, Download, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';

import type { UserType } from '../Types/Types';
import { powerStarMonthlyService, type PowerStarMonthlyResponse, type PowerStarMonthlyRow } from '../Services/PowerStarMonthly.service';
import { toAvatarUrl } from '../utils/avatar';
import logo from '../../public/logo (2).png';
import cardBg from '../../public/Marble Iphone Wallpaper • The Best Marble Backgrounds.jpg.jpeg';

const EXCLUDED_POWERSTAR_EMAILS = new Set([
    'drashtismartbiz@gmail.com',
    'krunalsmartbiz@gmail.com',
    'harshsmartbiz@gmail.com',
    'vadadoriyanency8@gmail.com',
    'ysiddhapura6@gmail.com'
].map((e) => e.trim().toLowerCase()));

const pad2 = (n: number) => String(n).padStart(2, '0');
const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const toNumberSafe = (v: unknown): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n;
};

const clampNonNegative = (n: number): number => {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
};

const normalizeWeekArray = (v: unknown): number[] => {
    const arr = Array.isArray(v) ? v : [];
    return [0, 0, 0, 0].map((_, idx) => clampNonNegative(toNumberSafe((arr as any)[idx])));
};

const weekLabels = ['W-1', 'W-2', 'W-3', 'W-4'];

type MetricKey = 'churn' | 'liveAssign' | 'hits';

const metricMeta: Array<{ key: MetricKey; title: string; valueSuffix?: string }> = [
    { key: 'churn', title: 'Churn' },
    { key: 'liveAssign', title: 'Live/Assign', valueSuffix: '%' },
    { key: 'hits', title: 'Hits' }
];

const sum = (arr: number[]) => (arr || []).reduce((a, b) => a + toNumberSafe(b), 0);

const avg = (arr: number[]) => {
    const a = Array.isArray(arr) ? arr.map((x) => toNumberSafe(x)) : [];
    if (a.length === 0) return 0;
    const presentWeeks = a.filter((n) => Number.isFinite(n) && n !== 0);
    if (presentWeeks.length === 0) return 0;
    return sum(presentWeeks) / presentWeeks.length;
};

const metricTotal = (metric: MetricKey, weeks: number[]) => {
    if (metric === 'liveAssign') return avg(weeks);
    return sum(weeks);
};

const formatMetricTotal = (metric: MetricKey, n: number) => {
    if (metric === 'liveAssign') return `${n.toFixed(0)}%`;
    return String(Math.round(n));
};

const getEmployeeOfTheMonthEmails = (): Set<string> => {
    try {
        const stored = localStorage.getItem('employeeOfTheMonthEmails');
        if (stored) {
            const emails = JSON.parse(stored);
            return new Set(Array.isArray(emails) ? emails.map(String) : []);
        }
    } catch (e) {
        console.warn('Failed to parse employeeOfTheMonthEmails from localStorage', e);
    }
    return new Set();
};

const isExcludedFromPowerStar = (email: unknown): boolean => {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return false;
    return EXCLUDED_POWERSTAR_EMAILS.has(key);
};

const PowerStarOfTheMonthPage = ({ currentUser }: { currentUser: UserType }) => {
    const roleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser]);
    const canEdit = useMemo(() => {
        const email = String((currentUser as any)?.email || '').trim().toLowerCase();
        if (email === 'snehasmartbiz@gmail.com') return true;
        return roleKey === 'md_manager' || roleKey === 'all_manager';
    }, [currentUser, roleKey]);

    const [monthKey, setMonthKey] = useState<string>(() => monthKeyOfDate(new Date()));
    const [activeMetric, setActiveMetric] = useState<MetricKey>('churn');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [data, setData] = useState<PowerStarMonthlyResponse | null>(null);
    const [rowsDraft, setRowsDraft] = useState<PowerStarMonthlyRow[]>([]);
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
            const fileName = `power-star-${topActiveRow?.name?.replace(/\s+/g, '-') || 'employee'}-${monthKey}.png`;
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
            const res = await powerStarMonthlyService.getMonthly(monthKey);
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

    const rowsNormalized = useMemo(() => {
        const list = Array.isArray(rowsDraft) ? rowsDraft : [];
        return list.map((r) => ({
            ...r,
            churn: normalizeWeekArray((r as any).churn),
            liveAssign: normalizeWeekArray((r as any).liveAssign),
            hits: normalizeWeekArray((r as any).hits),
            freezeChurn: Boolean((r as any).freezeChurn),
            freezeLiveAssign: Boolean((r as any).freezeLiveAssign),
            freezeHits: Boolean((r as any).freezeHits)
        }));
    }, [rowsDraft]);

    const handleWeekChange = useCallback((userId: string, metric: MetricKey, weekIndex: number, value: string) => {
        setRowsDraft((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((r) => {
                if (String((r as any).userId) !== String(userId)) return r;
                const nextArr = normalizeWeekArray((r as any)[metric]);
                nextArr[weekIndex] = clampNonNegative(toNumberSafe(value));
                return { ...r, [metric]: nextArr } as any;
            });
        });
    }, []);

    const handleFreezeToggle = useCallback((userId: string, metric: MetricKey) => {
        setRowsDraft((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((r) => {
                if (String((r as any).userId) !== String(userId)) return r;
                const fieldMap: Record<MetricKey, string> = {
                    churn: 'freezeChurn',
                    liveAssign: 'freezeLiveAssign',
                    hits: 'freezeHits'
                };
                const field = fieldMap[metric];
                return { ...r, [field]: !(r as any)[field] } as any;
            });
        });
    }, []);

    const save = useCallback(async () => {
        if (!canEdit) return;
        setSaving(true);
        try {
            const payload = {
                monthKey,
                rows: rowsNormalized.map((r) => ({
                    userId: String(r.userId),
                    email: String(r.email || ''),
                    churn: normalizeWeekArray(r.churn),
                    liveAssign: normalizeWeekArray(r.liveAssign),
                    hits: normalizeWeekArray(r.hits),
                    freezeChurn: Boolean((r as any).freezeChurn),
                    freezeLiveAssign: Boolean((r as any).freezeLiveAssign),
                    freezeHits: Boolean((r as any).freezeHits)
                }))
            };
            const res = await powerStarMonthlyService.saveMonthly(payload);
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
    }, [canEdit, fetchMonthly, monthKey, rowsNormalized]);

    const topMetricKey = useMemo<MetricKey>(() => {
        const totals = metricMeta.map((m) => {
            const key = m.key;
            const grandWeeks = [0, 0, 0, 0].map((_, idx) => {
                return rowsNormalized.reduce((acc, r) => acc + toNumberSafe(((r as any)[key] as number[])?.[idx]), 0);
            });
            const grandTotal = metricTotal(key, grandWeeks);
            return { key, score: grandTotal };
        });
        const best = totals.sort((a, b) => b.score - a.score)[0];
        return (best?.key || 'churn') as MetricKey;
    }, [rowsNormalized]);

    const topRowsByMetric = useMemo(() => {
        const out: Record<MetricKey, PowerStarMonthlyRow | null> = {
            churn: null,
            liveAssign: null,
            hits: null
        };
        const employeeOfTheMonthEmails = getEmployeeOfTheMonthEmails();
        (metricMeta || []).forEach((m) => {
            const key = m.key;
            const freezeField = key === 'churn' ? 'freezeChurn' : key === 'liveAssign' ? 'freezeLiveAssign' : 'freezeHits';
            const sorted = [...rowsNormalized]
                .filter((r) => !(r as any)[freezeField])
                .filter((r) => !employeeOfTheMonthEmails.has(String(r?.email || '').trim().toLowerCase()))
                .filter((r) => !isExcludedFromPowerStar((r as any)?.email))
                .sort((a, b) => {
                    const ta = metricTotal(key, (a as any)[key]);
                    const tb = metricTotal(key, (b as any)[key]);
                    return key === 'churn' ? ta - tb : tb - ta;
                });
            out[key] = (sorted[0] as any) || null;
        });
        return out;
    }, [rowsNormalized]);

    const topTotalLabelByMetric = useMemo(() => {
        const out: Record<MetricKey, string> = {
            churn: formatMetricTotal('churn', 0),
            liveAssign: formatMetricTotal('liveAssign', 0),
            hits: formatMetricTotal('hits', 0)
        };
        (metricMeta || []).forEach((m) => {
            const key = m.key;
            const row = topRowsByMetric[key];
            if (!row) {
                out[key] = formatMetricTotal(key, 0);
                return;
            }
            const weeks = normalizeWeekArray((row as any)?.[key]);
            const total = metricTotal(key, weeks);
            out[key] = formatMetricTotal(key, total);
        });
        return out;
    }, [topRowsByMetric]);

    const topActiveRow = useMemo(() => {
        const employeeOfTheMonthEmails = getEmployeeOfTheMonthEmails();
        const freezeField = activeMetric === 'churn' ? 'freezeChurn' : activeMetric === 'liveAssign' ? 'freezeLiveAssign' : 'freezeHits';
        const sorted = [...rowsNormalized]
            .filter((r) => !(r as any)[freezeField])
            .filter((r) => !employeeOfTheMonthEmails.has(String(r?.email || '').trim().toLowerCase()))
            .filter((r) => !isExcludedFromPowerStar((r as any)?.email))
            .sort((a, b) => {
                const ta = metricTotal(activeMetric, (a as any)[activeMetric]);
                const tb = metricTotal(activeMetric, (b as any)[activeMetric]);
                return activeMetric === 'churn' ? ta - tb : tb - ta;
            });
        return sorted[0] || null;
    }, [activeMetric, rowsNormalized]);

    const rowsSortedForActiveMetric = useMemo(() => {
        const employeeOfTheMonthEmails = getEmployeeOfTheMonthEmails();
        const freezeField = activeMetric === 'churn' ? 'freezeChurn' : activeMetric === 'liveAssign' ? 'freezeLiveAssign' : 'freezeHits';
        const unfrozen = [...rowsNormalized].filter((r) => !(r as any)[freezeField]);
        const frozen = [...rowsNormalized].filter((r) => (r as any)[freezeField]);
        const all = [...unfrozen, ...frozen];
        const filtered = all
            .filter((r) => !employeeOfTheMonthEmails.has(String(r?.email || '').trim().toLowerCase()))
            .filter((r) => !isExcludedFromPowerStar((r as any)?.email));
        const sortFn = (a: any, b: any) => {
            const ta = metricTotal(activeMetric, (a as any)[activeMetric]);
            const tb = metricTotal(activeMetric, (b as any)[activeMetric]);
            if (tb !== ta) return activeMetric === 'churn' ? ta - tb : tb - ta;
            const an = String((a as any)?.name || '').trim().toLowerCase();
            const bn = String((b as any)?.name || '').trim().toLowerCase();
            if (an && bn && an !== bn) return an.localeCompare(bn);
            const ae = String((a as any)?.email || '').trim().toLowerCase();
            const be = String((b as any)?.email || '').trim().toLowerCase();
            return ae.localeCompare(be);
        };
        return filtered.sort(sortFn);
    }, [activeMetric, rowsNormalized]);

    const topActiveTotalLabel = useMemo(() => {
        if (!topActiveRow) return formatMetricTotal(activeMetric, 0);
        const weeks = normalizeWeekArray((topActiveRow as any)?.[activeMetric]);
        const total = metricTotal(activeMetric, weeks);
        return formatMetricTotal(activeMetric, total);
    }, [activeMetric, topActiveRow]);

    const formatMonthLabel = (value?: string): string => {
        const raw = String(value || '').trim();
        const [y, m] = raw.split('-').map((x) => Number(x));
        if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) {
            return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const bgImage = cardBg;

    return (
        <div className="space-y-4 md:space-y-5">
            {/* Month Selector and Download Button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    {/* Empty div for spacing */}
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

            {/* Top Performers Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {metricMeta.map((m) => {
                    const row = topRowsByMetric[m.key];
                    const avatar = toAvatarUrl((row as any)?.avatar);
                    const label = topTotalLabelByMetric[m.key];
                    return (
                        <div
                            key={m.key}
                            className="relative overflow-hidden rounded-xl shadow-sm bg-white border border-blue-200"
                        >
                            <div className="relative p-3 sm:p-4 bg-gradient-to-br from-blue-50/50 to-white">
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] font-semibold text-blue-600 uppercase tracking-widest">{m.title}</div>
                                        <div className="text-[10px] sm:text-xs font-bold text-gray-700">Top Performer</div>
                                    </div>
                                    <div className="text-xs sm:text-sm font-extrabold text-blue-700">{label}</div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-blue-200 shadow-sm bg-white">
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt={row?.name || m.title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                                                <span className="text-blue-600 text-base sm:text-xl font-bold">
                                                    {String(row?.name || 'U').trim().charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-extrabold text-gray-800 truncate">{row?.name || 'Not any yet'}</div>
                                        <div className="text-[9px] sm:text-[10px] text-gray-500 truncate">{row?.email || ''}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                {/* Overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, rgba(230,240,250,0.85) 0%, rgba(204,228,248,0.85) 25%, rgba(179,215,245,0.85) 50%, rgba(153,201,242,0.85) 75%, rgba(128,187,240,0.85) 100%)',
                    }}
                />

                {/* Top Confetti */}
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
                            <h3 className="text-sm md:text-xl font-bold text-[#0f2a6e]">Power star of the month</h3>
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

                    {/* Main Grid */}
                    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6 items-center">
                        {/* Left Column */}
                        <div className="space-y-3 md:space-y-5 w-full px-2 md:px-0 order-1">
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
                                        {topActiveRow?.name || 'Not any yet'}
                                    </span>
                                </div>
                                <p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-2 break-all">{topActiveRow?.email || ''}</p>
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${i < Math.floor((topActiveRow ? 4 : 0)) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">({topActiveTotalLabel})</span>
                                    </div>
                                    <div className="h-1 w-1 bg-gray-300 rounded-full hidden sm:block" />
                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-600">
                                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
                                        <span>Verified Performance</span>
                                    </div>
                                </div>
                            </div>

                            <p
                                className="text-gray-700 text-[10px] sm:text-xs border-l-3 pl-2 italic leading-relaxed bg-white/50 p-2 rounded-sm inline-block w-auto"
                                style={{ borderLeftColor: '#3b82f6', borderLeftWidth: '3px' }}
                            >
                                {topActiveRow
                                    ? `"Outstanding performance with ${topActiveTotalLabel} in ${metricMeta.find((x) => x.key === activeMetric)?.title || 'Metric'}"`
                                    : '"No top performer selected yet"'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-[300px] sm:max-w-[400px]">
                                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                                    <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Active Metric</p>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-800">{metricMeta.find((x) => x.key === activeMetric)?.title || 'Metric'}</p>
                                </div>
                                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                                    <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Total Score</p>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-800">{topActiveTotalLabel}</p>
                                </div>
                            </div>

                            {data?.companyName && (
                                <div className="text-[8px] sm:text-[9px] text-gray-500">
                                    Company: <span className="font-semibold text-gray-700">{data.companyName}</span>
                                    {data?.updatedAt && (
                                        <span className="block sm:inline sm:ml-1"> • Last updated: <span className="font-semibold text-gray-700">{new Date(String(data.updatedAt)).toLocaleString()}</span></span>
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
                                    {toAvatarUrl((topActiveRow as any)?.avatar) ? (
                                        <img
                                            src={toAvatarUrl((topActiveRow as any)?.avatar)}
                                            alt={topActiveRow?.name}
                                            className="w-full h-full object-cover rounded-full border border-blue-200"
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                                            <span className="text-blue-600 text-4xl sm:text-5xl font-bold">
                                                {(topActiveRow?.name || 'U').trim().charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Power Star Badge */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] sm:w-[80%] z-[5]">
                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                                            <div className="relative px-2 sm:px-3 py-1.5 rounded-full bg-white border border-blue-100 shadow-md">
                                                <div className="text-[9px] sm:text-[13px] font-extrabold text-[#1e3a8a] tracking-wide uppercase text-center whitespace-nowrap sm:whitespace-nowrap">
                                                    Power star of the month
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

            {/* Metric Selection Section - Responsive */}
            <div className="relative overflow-hidden rounded-xl shadow-sm bg-white border border-blue-200">
                <div className="relative px-4 py-3 sm:px-5 sm:py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50/50 to-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm sm:text-base text-gray-800">Performance Metrics</h3>
                                <p className="text-[10px] sm:text-xs text-gray-500">Select metric to view rankings</p>
                            </div>
                        </div>
                        <span className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200 self-start sm:self-auto">
                            {metricMeta.length} Metrics
                        </span>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {metricMeta.map((m) => {
                            const isActive = activeMetric === m.key;
                            const isTopMetric = topMetricKey === m.key;
                            return (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => setActiveMetric(m.key)}
                                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition-all ${
                                        isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : isTopMetric
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {m.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Team Section - Responsive */}
            {rowsNormalized.length > 0 && (
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
                                    <p className="text-[10px] sm:text-xs text-gray-500">{metricMeta.find((x) => x.key === activeMetric)?.title || 'Metric'} • {formatMonthLabel(monthKey)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                    {rowsSortedForActiveMetric.length} Team Members
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
                            {rowsSortedForActiveMetric.map((r, index) => {
                                const weeks = normalizeWeekArray((r as any)[activeMetric]);
                                const total = metricTotal(activeMetric, weeks);
                                const isTop = index === 0;
                                const freezeField = activeMetric === 'churn' ? 'freezeChurn' : activeMetric === 'liveAssign' ? 'freezeLiveAssign' : 'freezeHits';
                                const isFrozen = Boolean((r as any)[freezeField]);
                                const isEvenIndex = (index % 2 === 0);
                                const cardBgClass = isEvenIndex ? 'bg-blue-50/50' : 'bg-white';

                                return (
                                    <div key={r.userId} className="group relative">
                                        <div className={`rounded-lg border p-3 sm:p-4 hover:shadow-md hover:border-blue-300 transition-all duration-300 ${cardBgClass} ${isTop ? 'ring-1 ring-amber-400' : ''} border-blue-200`}>
                                            {/* Rank Badge */}
                                            <div
                                                className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-sm ${
                                                    isTop ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                }`}
                                            >
                                                #{index + 1}
                                            </div>

                                            {/* Freeze Badge */}
                                            {isFrozen && (
                                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                                                    <span className="text-[8px] sm:text-[9px] font-bold text-rose-700 px-1.5 sm:px-2 py-0.5 bg-rose-100 rounded-full border border-rose-200 shadow-sm">
                                                        Freeze
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-start gap-2 sm:gap-3">
                                                {/* Avatar */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-blue-200 bg-white">
                                                        {toAvatarUrl((r as any)?.avatar) ? (
                                                            <img
                                                                src={toAvatarUrl((r as any)?.avatar)}
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

                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs mb-2">
                                                        <div className="flex items-center gap-0.5">
                                                            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400 fill-amber-400" />
                                                            <span className="font-semibold text-gray-700 text-[10px] sm:text-xs">{formatMetricTotal(activeMetric, total)}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-gray-500 text-[10px] sm:text-xs">Rank #{index + 1}</span>
                                                    </div>

                                                    {/* Weekly Stats Grid */}
                                                    <div className="grid grid-cols-4 gap-1 mb-2">
                                                        {weekLabels.map((wl, weekIndex) => (
                                                            <div key={wl} className="text-center">
                                                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-700">{toNumberSafe(weeks?.[weekIndex])}</p>
                                                                <p className="text-[7px] sm:text-[8px] text-gray-400">{wl}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Freeze Button */}
                                                    {canEdit && (activeMetric === 'liveAssign' || activeMetric === 'churn' || activeMetric === 'hits') && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFreezeToggle(r.userId, activeMetric)}
                                                                disabled={saving || loading}
                                                                className={`text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded font-medium transition-all ${
                                                                    isFrozen
                                                                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                                                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                } disabled:opacity-60`}
                                                            >
                                                                {isFrozen ? 'Unfreeze' : 'Freeze'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Editable Inputs */}
                                                    {canEdit && (
                                                        <div className="mt-2 pt-2 border-t border-blue-100">
                                                            <div className="grid grid-cols-4 gap-1">
                                                                {weekLabels.map((wl, weekIndex) => (
                                                                    <input
                                                                        key={wl}
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        className="w-full px-1 py-0.5 border border-blue-200 rounded text-[8px] sm:text-[9px] bg-white text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                                        value={String(toNumberSafe(weeks?.[weekIndex]) ?? 0)}
                                                                        disabled={saving || loading || isFrozen}
                                                                        onChange={(e) => handleWeekChange(r.userId, activeMetric, weekIndex, e.target.value)}
                                                                        min={0}
                                                                        step={activeMetric === 'liveAssign' ? '0.1' : '1'}
                                                                    />
                                                                ))}
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

export default PowerStarOfTheMonthPage;