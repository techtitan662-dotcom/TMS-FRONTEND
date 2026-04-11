import { useEffect, useMemo, useRef, useState } from 'react';
import echarts, { type EChartsOption } from '../utils/echarts';
import { Trash2 } from 'lucide-react';

import type { Task } from '../Types/Types';

type ManagerBucket = 'weekly' | 'monthly' | 'yearly';

type ManagerChartType = 'line' | 'bar' | 'area';

type GroupBy = 'none' | 'status' | 'company' | 'brand';

type ManagerOption = {
    key: string;
    label: string;
};

type ManagerAnalysisChartProps = {
    tasks: Task[];
    canDelete?: boolean;
    onDelete?: () => void;
};

const ManagerAnalysisChart = ({ tasks, canDelete = false, onDelete }: ManagerAnalysisChartProps) => {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);

    const [bucket, setBucket] = useState<ManagerBucket>('monthly');
    const [managerKey, setManagerKey] = useState<string>('all');
    const [chartType, setChartType] = useState<ManagerChartType>('line');
    const [groupBy, setGroupBy] = useState<GroupBy>('status');

    const normalizeStatus = (raw: any): 'completed' | 'pending' | 'cancelled' | 'other' => {
        const s = (raw ?? '').toString().trim().toLowerCase();
        if (s === 'completed' || s === 'done') return 'completed';
        if (s === 'cancelled' || s === 'canceled') return 'cancelled';
        if (s === 'pending' || s === 'in-progress' || s === 'in progress' || s === 'inprogress' || s === 'on-hold' || s === 'on hold') {
            return 'pending';
        }
        return s ? 'other' : 'pending';
    };

    const parseTaskDate = (raw: any): Date | null => {
        if (!raw) return null;
        if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
        if (typeof raw === 'number') {
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        if (typeof raw === 'string') {
            const trimmed = raw.trim();

            const direct = new Date(trimmed);
            if (!Number.isNaN(direct.getTime())) {
                const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmed);
                if (isDateOnly) direct.setHours(23, 59, 59, 999);
                return direct;
            }

            // Support common non-ISO formats like DD/MM/YYYY or DD-MM-YYYY (optionally with time)
            const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (m) {
                const dd = Number(m[1]);
                const mm = Number(m[2]);
                const yyyy = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
                const hh = m[4] ? Number(m[4]) : 23;
                const min = m[5] ? Number(m[5]) : 59;
                const ss = m[6] ? Number(m[6]) : 59;
                const d = new Date(yyyy, mm - 1, dd, hh, min, ss, 999);
                return Number.isNaN(d.getTime()) ? null : d;
            }

            return null;
        }
        if (typeof raw === 'object') {
            const maybe = (raw as any)?.$date ?? (raw as any)?.date ?? (raw as any)?.value;
            if (typeof maybe === 'string' || typeof maybe === 'number') {
                const d = new Date(maybe);
                return Number.isNaN(d.getTime()) ? null : d;
            }
        }
        return null;
    };

    const getAssigneeInfo = (t: Task): { key: string; label: string; isManager: boolean } => {
        const assignedToCandidate = (t as any)?.assignedToUser || (t as any)?.assignedTo;

        if (assignedToCandidate && typeof assignedToCandidate === 'object') {
            const role = ((assignedToCandidate as any)?.role || '').toString().trim().toLowerCase();
            const email = ((assignedToCandidate as any)?.email || '').toString().trim();
            const name = ((assignedToCandidate as any)?.name || '').toString().trim();
            const id = ((assignedToCandidate as any)?.id || (assignedToCandidate as any)?._id || '').toString().trim();

            const key = email || id || name;
            const label = name || (email ? email.split('@')[0] || email : key);
            return { key, label, isManager: role === 'manager' };
        }

        const rawKey = ((t as any)?.assignedTo || '').toString().trim();
        const name = ((t as any)?.assignedToName || '').toString().trim();
        const key = rawKey || name;
        const label = name || (rawKey ? rawKey.split('@')[0] || rawKey : key);
        return { key, label, isManager: false };
    };

    const managerOptions = useMemo((): ManagerOption[] => {
        const map = new Map<string, string>();
        const managerKeys = new Set<string>();

        (tasks || []).forEach((t) => {
            const { key, label, isManager } = getAssigneeInfo(t);
            if (!key) return;
            map.set(key, label);
            if (isManager) managerKeys.add(key);
        });

        const hasManagers = managerKeys.size > 0;

        const entries = hasManagers ? Array.from(managerKeys).map((k) => [k, map.get(k) || k] as const) : Array.from(map.entries());

        const opts = entries
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return [{ key: 'all', label: 'All managers' }, ...opts];
    }, [tasks]);

    useEffect(() => {
        if (managerKey !== 'all' && !managerOptions.some((m) => m.key === managerKey)) {
            setManagerKey('all');
        }
    }, [managerKey, managerOptions]);

    const seriesData = useMemo(() => {
        const isAllManagersView = managerKey === 'all';

        const bucketKey = (d: Date): string => {
            if (bucket === 'yearly') return `${d.getFullYear()}`;
            if (bucket === 'monthly') {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }

            // weekly (ISO-ish)
            const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const dayNum = date.getUTCDay() || 7;
            date.setUTCDate(date.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        };

        const getGroupValue = (t: Task): string => {
            if (groupBy === 'status') {
                const status = normalizeStatus((t as any)?.status);
                const due = parseTaskDate((t as any)?.dueDate);
                const isCompleted = status === 'completed';
                const isOverdue = !isCompleted && status !== 'cancelled' && due ? due.getTime() < Date.now() : false;
                if (isCompleted) return 'completed';
                if (isOverdue) return 'overdue';
                return 'pending';
            }
            if (groupBy === 'company') {
                return (((t as any)?.companyName || (t as any)?.company || 'unknown') as string).toString().trim() || 'Unknown';
            }
            if (groupBy === 'brand') {
                return (((t as any)?.brand || 'unknown') as string).toString().trim() || 'Unknown';
            }
            return 'Tasks';
        };

        const countsByBucket = new Map<string, number>();
        const countsByBucketAndGroup = new Map<string, Map<string, number>>();
        const countsByAxis = new Map<string, number>();
        const countsByAxisAndGroup = new Map<string, Map<string, number>>();
        const groupSet = new Set<string>();

        let considered = 0;
        let withAssignee = 0;
        let withDate = 0;

        const assigneeLabelByKey = new Map<string, string>(managerOptions.filter((m) => m.key !== 'all').map((m) => [m.key, m.label] as const));

        (tasks || []).forEach((t) => {
            considered += 1;
            const { key, label } = getAssigneeInfo(t);
            if (!key) return;

            withAssignee += 1;

            // In "All managers" view, include all assignees and group by manager key.
            // When a specific manager is selected, only include that manager's tasks.
            if (!isAllManagersView && key !== managerKey) return;

            // Default filter: only include Completed, Pending and Overdue tasks
            const status = normalizeStatus((t as any)?.status);
            const due = parseTaskDate((t as any)?.dueDate);
            const isCompleted = status === 'completed';
            const isOverdue = !isCompleted && status !== 'cancelled' && due ? due.getTime() < Date.now() : false;
            const isPending = !isCompleted && !isOverdue;

            if (!(isCompleted || isOverdue || isPending)) return;

            if (isAllManagersView) {
                const axisKey = key;
                if (!assigneeLabelByKey.has(axisKey)) assigneeLabelByKey.set(axisKey, label || axisKey);

                if (groupBy === 'none') {
                    countsByAxis.set(axisKey, (countsByAxis.get(axisKey) || 0) + 1);
                    return;
                }

                const g = getGroupValue(t);
                groupSet.add(g);
                if (!countsByAxisAndGroup.has(axisKey)) countsByAxisAndGroup.set(axisKey, new Map());
                const inner = countsByAxisAndGroup.get(axisKey)!;
                inner.set(g, (inner.get(g) || 0) + 1);
                return;
            }

            const d =
                parseTaskDate((t as any)?.createdAt) ||
                parseTaskDate((t as any)?.updatedAt) ||
                parseTaskDate((t as any)?.dueDate);
            if (!d) return;

            withDate += 1;

            const k = bucketKey(d);

            if (groupBy === 'none') {
                countsByBucket.set(k, (countsByBucket.get(k) || 0) + 1);
                return;
            }

            const g = getGroupValue(t);
            groupSet.add(g);
            if (!countsByBucketAndGroup.has(k)) countsByBucketAndGroup.set(k, new Map());
            const inner = countsByBucketAndGroup.get(k)!;
            inner.set(g, (inner.get(g) || 0) + 1);
        });

        const labels = (() => {
            if (!isAllManagersView) {
                return groupBy === 'none'
                    ? Array.from(countsByBucket.keys()).sort((a, b) => a.localeCompare(b))
                    : Array.from(countsByBucketAndGroup.keys()).sort((a, b) => a.localeCompare(b));
            }

            const keys = groupBy === 'none' ? Array.from(countsByAxis.keys()) : Array.from(countsByAxisAndGroup.keys());
            return keys.sort((a, b) => (assigneeLabelByKey.get(a) || a).localeCompare(assigneeLabelByKey.get(b) || b));
        })();

        const groups =
            groupBy === 'none'
                ? ['Tasks']
                : groupBy === 'status'
                    ? ['completed', 'pending', 'overdue']
                    : Array.from(groupSet.values()).sort((a, b) => a.localeCompare(b));

        const series = groups.map((g) => {
            const data = labels.map((label) => {
                if (isAllManagersView) {
                    if (groupBy === 'none') return countsByAxis.get(label) || 0;
                    return countsByAxisAndGroup.get(label)?.get(g) || 0;
                }

                if (groupBy === 'none') return countsByBucket.get(label) || 0;
                return countsByBucketAndGroup.get(label)?.get(g) || 0;
            });

            const displayName =
                groupBy === 'status'
                    ? g === 'completed'
                        ? 'Completed'
                        : g === 'pending'
                            ? 'Pending'
                            : g === 'overdue'
                                ? 'Overdue'
                                : g
                    : g;

            return { name: displayName, data };
        });

        return {
            labels: isAllManagersView ? labels.map((k) => assigneeLabelByKey.get(k) || k) : labels,
            series,
            debug: { considered, withAssignee, withDate },
        };
    }, [tasks, bucket, managerKey, groupBy, managerOptions]);

    useEffect(() => {
        const dom = chartRef.current;
        if (!dom) return;

        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        chartInstanceRef.current = chart;

        const hasData =
            seriesData.labels.length > 0 &&
            seriesData.series.some((s) => (s.data || []).some((v) => (Number(v) || 0) > 0));

        const option: EChartsOption = {
            title: hasData
                ? undefined
                : {
                    text: 'No data',
                    subtext: `Tasks: ${seriesData.debug.considered} | Assignee: ${seriesData.debug.withAssignee} | Date: ${seriesData.debug.withDate}`,
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 20, top: 30, bottom: 60, containLabel: true },
            xAxis: {
                type: 'category',
                data: seriesData.labels,
                axisLabel: { 
                    rotate: seriesData.labels.length > 5 ? 45 : 30,
                    interval: 0,
                    hideOverlap: true,
                    overflow: 'break',
                    width: 70
                },
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
            },
            legend: seriesData.series.length > 1 ? { top: 0 } : { show: false },
            series: seriesData.series.map((s, idx) => {
                const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                const color = colorPalette[idx % colorPalette.length];
                return {
                    name: s.name,
                    type: chartType === 'bar' ? 'bar' : 'line',
                    data: s.data,
                    smooth: chartType !== 'bar',
                    symbolSize: 7,
                    stack: chartType === 'bar' && groupBy !== 'none' ? 'total' : undefined,
                    itemStyle: { color },
                    lineStyle: { color, width: 3 },
                    areaStyle: chartType === 'area' ? { opacity: 0.18 } : undefined,
                    barWidth: chartType === 'bar' ? 20 : undefined,
                };
            }) as any,
        };

        chart.setOption(option, true);
        requestAnimationFrame(() => chart.resize());

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const ro = new ResizeObserver(() => chart.resize());
        ro.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            ro.disconnect();
        };
    }, [seriesData, chartType]);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Manager analysis</h2>
                <div className="flex items-center gap-2 flex-wrap justify-end flex-grow">
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                    >
                        <option value="none">Group: None</option>
                        <option value="status">Group: Status</option>
                        <option value="company">Group: Company</option>
                        <option value="brand">Group: Brand</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value as ManagerChartType)}
                    >
                        <option value="line">Line</option>
                        <option value="area">Area</option>
                        <option value="bar">Bar</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        value={bucket}
                        onChange={(e) => setBucket(e.target.value as ManagerBucket)}
                    >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        value={managerKey}
                        onChange={(e) => setManagerKey(e.target.value)}
                    >
                        {managerOptions.map((m) => (
                            <option key={m.key} value={m.key}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    {canDelete && (
                        <button
                            type="button"
                            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                            aria-label="Hide chart"
                            onClick={() => onDelete?.()}
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            <div ref={chartRef} className="w-full" style={{ height: 360 }} />
        </div>
    );
};

export default ManagerAnalysisChart;
