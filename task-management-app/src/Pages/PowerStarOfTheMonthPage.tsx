import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Star, CheckCircle, Users, Trophy, Download, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';

import type { UserType } from '../Types/Types';
import { powerStarMonthlyService, type PowerStarMonthlyResponse, type PowerStarMonthlyRow } from '../Services/PowerStarMonthly.service';
import { toAvatarUrl } from '../utils/avatar';

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
                style: { borderRadius: '16px' },
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

            {/* Top Performers Grid - Premium Dark Blue */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metricMeta.map((m) => {
                    const row = topRowsByMetric[m.key];
                    const avatar = toAvatarUrl((row as any)?.avatar);
                    const label = topTotalLabelByMetric[m.key];
                    return (
                        <div
                            key={m.key}
                            className="relative overflow-hidden rounded-xl shadow-lg border border-white/20 bg-white"
                        >
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(135deg, #0f2a6e 0%, #1e3a8a 25%, #3b5cae 45%, #3b5cae 55%, #1e3a8a 75%, #0f2a6e 100%)',
                                }}
                            />
                            <div className="relative p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{m.title}</div>
                                        <div className="text-xs font-bold text-white/90">Top Performer</div>
                                    </div>
                                    <div className="text-sm font-extrabold text-white">{label}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/30 shadow-sm bg-white/10">
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt={row?.name || m.title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/20 to-white/10">
                                                <span className="text-white text-xl font-bold">
                                                    {String(row?.name || 'U').trim().charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-extrabold text-white truncate">{row?.name || 'Not any yet'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MAIN CARD - Premium Dark Blue */}
            <div ref={cardRef} className="relative overflow-hidden rounded-xl shadow-lg border border-white/20 bg-white">
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #0f2a6e 0%, #1e3a8a 25%, #3b5cae 45%, #3b5cae 55%, #1e3a8a 75%, #0f2a6e 100%)',
                    }}
                />
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px',
                    }}
                />
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
                            <div>
                                <div className="mb-1">
                                    <span className="text-xs uppercase tracking-wide text-white/70 font-semibold block">Welcome!</span>
                                    <h1 className="text-2xl lg:text-3xl font-extrabold drop-shadow-sm">
                                        <span className="text-white">Congratulations </span>
                                        <span className="text-white/90 px-1 inline-block">
                                            {topActiveRow?.name || 'Not any yet'}
                                        </span>
                                    </h1>
                                </div>
                                <p className="text-xs font-medium text-white/70 mb-2">{topActiveRow?.email || ''}</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-3.5 w-3.5 ${i < Math.floor((topActiveRow ? 4 : 0)) ? 'text-amber-300 fill-amber-300' : 'text-white/30'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-medium text-white/80">({topActiveTotalLabel})</span>
                                    </div>
                                    <div className="h-1 w-1 bg-white/30 rounded-full" />
                                    <div className="flex items-center gap-1 text-xs text-white/80">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Verified Performance</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-white/80 text-xs border-l-2 pl-3 italic leading-relaxed" style={{ borderLeftColor: 'white', borderLeftWidth: '2px' }}>
                                {topActiveRow ? `"Outstanding performance with ${topActiveTotalLabel} in ${metricMeta.find((x) => x.key === activeMetric)?.title || 'Metric'}"` : '"No top performer selected yet"'}
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] text-white/70 font-semibold mb-1">Active Metric</p>
                                    <p className="text-sm font-bold text-white">{metricMeta.find((x) => x.key === activeMetric)?.title || 'Metric'}</p>
                                </div>
                                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] text-white/70 font-semibold mb-1">Total Score</p>
                                    <p className="text-sm font-bold text-white">{topActiveTotalLabel}</p>
                                </div>
                            </div>

                            {data?.companyName && (
                                <div className="text-[10px] text-white/60">
                                    Company: <span className="font-semibold text-white/80">{data.companyName}</span>
                                    {data?.updatedAt && (
                                        <span> • Last updated: <span className="font-semibold text-white/80">{new Date(String(data.updatedAt)).toLocaleString()}</span></span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Profile Image */}
                        <div className="relative flex justify-center lg:justify-end">
                            <div className="relative w-56 h-56 lg:w-64 lg:h-64">
                                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8), rgba(255,255,255,0.4), white)', padding: '3px' }}>
                                    <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm" />
                                </div>
                                <div className="absolute inset-1.5 rounded-full overflow-hidden border-2 border-white/30">
                                    {toAvatarUrl((topActiveRow as any)?.avatar) ? (
                                        <img
                                            src={toAvatarUrl((topActiveRow as any)?.avatar)}
                                            alt={topActiveRow?.name}
                                            className="w-full h-full object-cover object-center"
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/20 to-white/10">
                                            <span className="text-white text-4xl font-bold">
                                                {(topActiveRow?.name || 'U').trim().charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-0 right-0 text-center">
                                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold border shadow-sm bg-white/20 backdrop-blur-sm border-white/30 text-white">
                                            ⭐ POWER STAR ⭐
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Selection Section */}
            <div className="relative overflow-hidden rounded-xl shadow-md bg-white border border-[#3b82f6]/20">
                <div className="relative px-5 py-3 border-b border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-[#3b82f6]/10">
                                <Trophy className="h-4 w-4 text-[#3b82f6]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-gray-800">Performance Metrics</h3>
                                <p className="text-[10px] text-gray-500">Select metric to view rankings</p>
                            </div>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full font-semibold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                            {metricMeta.length} Metrics
                        </span>
                    </div>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-3 gap-2">
                        {metricMeta.map((m) => {
                            const isActive = activeMetric === m.key;
                            const isTopMetric = topMetricKey === m.key;
                            return (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => setActiveMetric(m.key)}
                                    className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all ${isActive
                                        ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-sm'
                                        : isTopMetric
                                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
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

            {/* Team Section */}
            {rowsNormalized.length > 0 && (
                <div className="relative overflow-hidden rounded-xl shadow-md bg-white border border-[#3b82f6]/20">
                    <div className="relative px-5 py-3 border-b border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-[#3b82f6]/10">
                                    <Users className="h-4 w-4 text-[#3b82f6]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-800">Team Performance Dashboard</h3>
                                    <p className="text-[10px] text-gray-500">{metricMeta.find((x) => x.key === activeMetric)?.title || 'Metric'} • This month</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-1 rounded-full font-semibold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                                    {rowsSortedForActiveMetric.length} Team Members
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
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rowsSortedForActiveMetric.map((r, index) => {
                                const weeks = normalizeWeekArray((r as any)[activeMetric]);
                                const total = metricTotal(activeMetric, weeks);
                                const isTop = index === 0;
                                const freezeField = activeMetric === 'churn' ? 'freezeChurn' : activeMetric === 'liveAssign' ? 'freezeLiveAssign' : 'freezeHits';
                                const isFrozen = Boolean((r as any)[freezeField]);

                                return (
                                    <div key={r.userId} className="group relative">
                                        <div className={`rounded-lg border p-3 hover:shadow-md transition-all ${isTop ? 'ring-1 ring-amber-400' : ''} ${isFrozen ? 'opacity-75' : ''}`} style={{ borderColor: isTop ? '#fbbf24' : '#e5e7eb' }}>
                                            {isFrozen && (
                                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                                                    <span className="text-[9px] font-bold text-rose-700 px-2 py-0.5 bg-rose-100 rounded-full border border-rose-200 shadow-sm">
                                                        Freeze
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${isTop ? 'bg-amber-500' : 'bg-gray-500'}`}>
                                                #{index + 1}
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <div className="relative">
                                                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200">
                                                        {toAvatarUrl((r as any)?.avatar) ? (
                                                            <img src={toAvatarUrl((r as any)?.avatar)} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                                <span className="font-bold text-xs text-gray-600">
                                                                    {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-800 text-xs mb-0.5 truncate">{r.name}</h4>
                                                    <div className="flex items-center gap-1.5 text-[10px] mb-1">
                                                        <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                                                        <span className="font-semibold text-gray-700">{formatMetricTotal(activeMetric, total)}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-gray-500">#{index + 1}</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-0.5 mb-1.5">
                                                        {weekLabels.map((wl, weekIndex) => (
                                                            <div key={wl} className="text-center">
                                                                <p className="text-[9px] font-bold text-gray-700">{toNumberSafe(weeks?.[weekIndex])}</p>
                                                                <p className="text-[7px] text-gray-400">{wl}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {canEdit && (activeMetric === 'liveAssign' || activeMetric === 'churn' || activeMetric === 'hits') && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFreezeToggle(r.userId, activeMetric)}
                                                                disabled={saving || loading}
                                                                className={`text-[8px] px-1.5 py-0.5 rounded font-medium transition-all ${isFrozen
                                                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                    } disabled:opacity-60`}
                                                            >
                                                                {isFrozen ? 'Unfreeze' : 'Freeze'}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {canEdit && (
                                                        <div className="mt-1.5">
                                                            <div className="grid grid-cols-4 gap-0.5">
                                                                {weekLabels.map((wl, weekIndex) => (
                                                                    <input
                                                                        key={wl}
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        className="w-full px-1 py-0.5 border border-gray-200 rounded text-[8px] bg-white text-center"
                                                                        value={String(toNumberSafe(weeks?.[weekIndex]) ?? 0)}
                                                                        disabled={saving || loading}
                                                                        onChange={(e) => handleWeekChange(r.userId, activeMetric, weekIndex, e.target.value)}
                                                                        min={0}
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