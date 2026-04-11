import type { EChartsOption } from 'echarts';
import type { TitleComponentOption } from 'echarts/components';

export type ChartType =
    | 'bar'
    | 'bar_label_rotation'
    | 'column'
    | 'stacked_bar'
    | 'grouped_bar'
    | 'clustered_bar'
    | 'line'
    | 'area'
    | 'burnup'
    | 'burndown'
    | 'pie'
    | 'donut'
    | 'number'
    | 'lollipop';

export type DimensionKey =
    | 'assignee'
    | 'assignee_role'
    | 'creator'
    | 'creator_role'
    | 'section'
    | 'task_type'
    | 'tag'
    | 'completion_status'
    | 'status'
    | 'priority'
    | 'company'
    | 'brand'
    | 'project'
    | 'created_day'
    | 'created_week'
    | 'created_month'
    | 'created_year'
    | 'created_year_range'
    | 'due_day'
    | 'due_week'
    | 'due_month'
    | 'due_year'
    | 'due_year_range'
    | 'completed_day'
    | 'completed_week'
    | 'completed_month'
    | 'completed_year'
    | 'completed_year_range'
    | 'department'
    | 'team'
    | 'location'
    | 'phase'
    | 'milestone'
    | 'sprint';

export type YEntity = 'task' | 'time' | 'time_entry' | 'custom_field' | 'budget' | 'cost' | 'revenue';

export type MetricKey =
    | 'count'
    | 'completed'
    | 'pending'
    | 'in_progress'
    | 'on_hold'
    | 'cancelled'
    | 'overdue'
    | 'upcoming'
    | 'unscheduled'
    | 'due_today'
    | 'due_this_week'
    | (string & {});

export type CustomWidget = {
    id: string;
    title: string;
    chartType: ChartType;
    xAxis: DimensionKey;
    groupBy: DimensionKey | 'none';
    yEntity: YEntity;
    metric?: MetricKey;
    metrics?: MetricKey[];
    showPercent?: boolean;
    filters?: {
        status?: 'all' | 'completed' | 'pending' | 'in-progress' | 'on-hold' | 'cancelled';
        priority?: 'all' | 'low' | 'medium' | 'high' | 'urgent';
        assignee?: string;
        taskType?: string;
        company?: string;
        brand?: string;
        dateField?: 'createdAt' | 'dueDate' | 'completedAt' | 'updatedAt';
        startDate?: string;
        endDate?: string;
    };
};

export const normalizeText = (v: unknown): string => (v || '').toString().trim();

export const normalizeStatusForFilter = (v: string): string => {
    const s = (v || '').toString().trim().toLowerCase();
    if (s === 'in progress' || s === 'in_progress' || s === 'in-progress') return 'in-progress';
    return s;
};

export const stripDeletedEmailSuffix = (raw: string): string => {
    const s = (raw || '').toString().trim();
    if (!s) return '';
    const idx = s.toLowerCase().indexOf('.deleted.');
    if (idx === -1) return s;
    return s.slice(0, idx);
};

export const extractUserLabel = (value: unknown, nameHint?: unknown): string => {
    const hint = normalizeText(nameHint);
    if (hint) return hint;

    if (!value) return 'Unknown';
    if (typeof value === 'string') {
        const s = value.trim();
        if (!s) return 'Unknown';
        if (s.includes('@')) return s.split('@')[0] || s;
        return s;
    }
    if (typeof value === 'object') {
        const name = normalizeText((value as any)?.name);
        if (name) return name;
        const email = normalizeText((value as any)?.email);
        if (email) return email.includes('@') ? email.split('@')[0] || email : email;
        const id = normalizeText((value as any)?.id || (value as any)?._id);
        if (id) return id;
    }
    return 'Unknown';
};

export const getCompletionStatus = (t: any): string => {
    const status = normalizeText(t?.status || '');
    if (status === 'completed') return 'Completed';

    const due = new Date(normalizeText(t?.dueDate));
    if (Number.isNaN(due.getTime())) return 'Unscheduled';

    const now = new Date();
    if (due.getTime() < now.getTime()) return 'Overdue';
    return 'Upcoming';
};

export const formatYear = (raw: unknown): string => {
    const d = new Date(normalizeText(raw));
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return `${d.getFullYear()}`;
};

export const formatYearRange = (raw: unknown): string => {
    const d = new Date(normalizeText(raw));
    if (Number.isNaN(d.getTime())) return 'Unknown';
    const y = d.getFullYear();
    return `${y}-${y + 1}`;
};

export const formatMonth = (raw: unknown): string => {
    const d = new Date(normalizeText(raw));
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const formatDay = (raw: unknown): string => {
    const d = new Date(normalizeText(raw));
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return d.toISOString().slice(0, 10);
};

export const formatWeek = (raw: unknown): string => {
    const d = new Date(normalizeText(raw));
    if (Number.isNaN(d.getTime())) return 'Unknown';
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const getDimensionValue = (t: any, key: DimensionKey): string => {
    if (key === 'assignee') return extractUserLabel(t?.assignedTo, t?.assignedToName);
    if (key === 'assignee_role') return normalizeText(t?.assignedTo?.role) || 'Unknown';
    if (key === 'creator') return extractUserLabel(t?.assignedBy, t?.assignedByName);
    if (key === 'creator_role') return normalizeText(t?.assignedBy?.role) || 'Unknown';
    if (key === 'section') return normalizeText(t?.category) || 'Unknown';
    if (key === 'task_type') return normalizeText(t?.taskType || t?.type) || 'Unknown';
    if (key === 'tag') {
        const tags = t?.tags;
        if (Array.isArray(tags) && tags.length) {
            const first = normalizeText(tags[0]);
            return first || 'Unknown';
        }
        return 'No tag';
    }
    if (key === 'completion_status') return getCompletionStatus(t);
    if (key === 'status') return normalizeText(t?.status);
    if (key === 'priority') return normalizeText(t?.priority);
    if (key === 'company') return normalizeText(t?.companyName || t?.company) || 'Unknown';
    if (key === 'brand') return normalizeText(t?.brand) || 'Unknown';
    if (key === 'project') return normalizeText(t?.project) || 'Unknown';
    if (key === 'created_day') return formatDay(t?.createdAt);
    if (key === 'created_week') return formatWeek(t?.createdAt);
    if (key === 'created_month') return formatMonth(t?.createdAt);
    if (key === 'created_year') return formatYear(t?.createdAt);
    if (key === 'created_year_range') return formatYearRange(t?.createdAt);
    if (key === 'due_day') return formatDay(t?.dueDate);
    if (key === 'due_week') return formatWeek(t?.dueDate);
    if (key === 'due_month') return formatMonth(t?.dueDate);
    if (key === 'due_year') return formatYear(t?.dueDate);
    if (key === 'due_year_range') return formatYearRange(t?.dueDate);
    if (key === 'completed_day') {
        const completedAt = t?.completedAt || (t?.status === 'completed' ? t?.updatedAt : '');
        return formatDay(completedAt);
    }
    if (key === 'completed_week') {
        const completedAt = t?.completedAt || (t?.status === 'completed' ? t?.updatedAt : '');
        return formatWeek(completedAt);
    }
    if (key === 'completed_month') {
        const completedAt = t?.completedAt || (t?.status === 'completed' ? t?.updatedAt : '');
        return formatMonth(completedAt);
    }
    if (key === 'completed_year') {
        const completedAt = t?.completedAt || (t?.status === 'completed' ? t?.updatedAt : '');
        return formatYear(completedAt);
    }
    if (key === 'completed_year_range') {
        const completedAt = t?.completedAt || (t?.status === 'completed' ? t?.updatedAt : '');
        return formatYearRange(completedAt);
    }
    if (key === 'department') return normalizeText(t?.department) || 'Unknown';
    if (key === 'team') return normalizeText(t?.team) || 'Unknown';
    if (key === 'location') return normalizeText(t?.location) || 'Unknown';
    if (key === 'phase') return normalizeText(t?.phase) || 'Unknown';
    if (key === 'milestone') return normalizeText(t?.milestone) || 'Unknown';
    if (key === 'sprint') return normalizeText(t?.sprint) || 'Unknown';
    return 'Unknown';
};

export const getMetricValue = (t: any, yEntity: YEntity, metric: MetricKey, additionalMetrics: { value: string; label: string }[] = []): number | null => {
    if (yEntity === 'task') {
        if (metric === 'count') return 1;

        const status = normalizeText(t?.status || '');
        if (metric === 'completed') return status === 'completed' ? 1 : null;
        if (metric === 'pending') return status === 'pending' ? 1 : null;
        if (metric === 'in_progress') return status === 'in-progress' ? 1 : null;
        if (metric === 'on_hold') return status === 'on-hold' ? 1 : null;
        if (metric === 'cancelled') return status === 'cancelled' ? 1 : null;

        const completion = getCompletionStatus(t);
        if (metric === 'overdue') return completion === 'Overdue' ? 1 : null;
        if (metric === 'upcoming') return completion === 'Upcoming' ? 1 : null;
        if (metric === 'unscheduled') return completion === 'Unscheduled' ? 1 : null;

        const isCustomMetric = additionalMetrics.some(m => m.value === metric);
        if (isCustomMetric) {
            const customMetricValue = t?.[metric];
            if (customMetricValue !== undefined) {
                const num = Number(customMetricValue);
                return Number.isFinite(num) ? num : null;
            }
        }

        return null;
    }

    if (yEntity === 'time' && metric === 'time_to_complete_hours') {
        const status = normalizeText(t?.status || '');
        if (status !== 'completed') return null;
        const createdAt = new Date(normalizeText(t?.createdAt));
        const updatedAt = new Date(normalizeText(t?.updatedAt));
        if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) return null;
        const ms = updatedAt.getTime() - createdAt.getTime();
        if (ms <= 0) return null;
        return ms / (1000 * 60 * 60);
    }

    if (yEntity === 'time_entry' && metric === 'actual_time_hours') {
        const candidate =
            t?.actualTimeHours ??
            t?.timeSpentHours ??
            t?.actualTime ??
            t?.timeSpent;
        const n = Number(candidate);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    if (yEntity === 'custom_field' && metric === 'custom_field_time_hours') {
        const candidate = t?.customFieldTimeHours ?? t?.customFieldTime;
        const n = Number(candidate);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    if (yEntity === 'budget' || yEntity === 'cost' || yEntity === 'revenue') {
        const candidate = t?.[metric] ?? t?.[`${yEntity}_${metric}`];
        const n = Number(candidate);
        return Number.isFinite(n) ? n : null;
    }

    return null;
};

export const TASK_METRIC_OPTIONS = [
    { value: 'count', label: 'Task Count' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
];

export const ALL_METRIC_OPTIONS = [
    ...TASK_METRIC_OPTIONS,
    { value: 'actual_time_hours', label: 'Actual Time (Hours)' },
    { value: 'time_to_complete_hours', label: 'Time to Complete' },
];

export const getMetricLabel = (metric: MetricKey, additionalMetrics: { value: string; label: string }[] = []): string => {
    const customMetric = additionalMetrics.find((m) => m.value === metric);
    if (customMetric) return customMetric.label;
    const standard = ALL_METRIC_OPTIONS.find((o: any) => o.value === metric);
    return standard ? standard.label : metric;
};

export const appendQ = (base: string, segment: string): string => {
    if (!segment) return base;
    return base ? `${base} ${segment}` : segment;
};

export const mapDimensionToFilters = (dim: DimensionKey, val: string): { q?: string; status?: string; priority?: string; company?: string; brand?: string; taskType?: string; date?: string } => {
    const v = val.toLowerCase();
    if (dim === 'status') return { status: v };
    if (dim === 'priority') return { priority: v };
    if (dim === 'company') return { company: v };
    if (dim === 'brand') return { brand: v };
    if (dim === 'task_type') return { taskType: v };
    if (dim === 'assignee') return { q: val };
    if (dim === 'creator') return { q: `from:${val}` };
    return { q: val };
};

export const buildOptionForWidget = (w: CustomWidget, filteredTasks: any[], additionalMetrics: { value: string; label: string }[] = []): EChartsOption => {
    const activeMetrics = (Array.isArray(w.metrics) && w.metrics.length ? w.metrics : [w.metric || 'count']) as MetricKey[];
    const hasMultiMetrics = activeMetrics.length > 1;

    const effectiveGroupBy =
        hasMultiMetrics
            ? ('none' as const)
            : w.groupBy === 'none' && (w.chartType === 'stacked_bar' || w.chartType === 'grouped_bar' || w.chartType === 'clustered_bar')
                ? (w.xAxis === 'status' ? 'priority' : 'status')
                : w.groupBy;

    const dataMap = new Map<string, Map<string, number>>();
    const allGroups = new Set<string>();

    filteredTasks.forEach((t) => {
        const xVal = getDimensionValue(t, w.xAxis);
        const gVal = effectiveGroupBy === 'none' ? 'Tasks' : getDimensionValue(t, effectiveGroupBy);

        if (!dataMap.has(xVal)) dataMap.set(xVal, new Map());
        const xMap = dataMap.get(xVal)!;

        if (hasMultiMetrics) {
            activeMetrics.forEach((m) => {
                const val = getMetricValue(t, w.yEntity, m, additionalMetrics);
                if (val !== null) {
                    const mLabel = getMetricLabel(m, additionalMetrics);
                    xMap.set(mLabel, (xMap.get(mLabel) || 0) + val);
                    allGroups.add(mLabel);
                }
            });
        } else {
            const val = getMetricValue(t, w.yEntity, activeMetrics[0], additionalMetrics);
            if (val !== null) {
                xMap.set(gVal, (xMap.get(gVal) || 0) + val);
                allGroups.add(gVal);
            }
        }
    });

    const categories = Array.from(dataMap.keys()).sort();
    const groupList = Array.from(allGroups).sort();

    if (w.chartType === 'pie' || w.chartType === 'donut') {
        const pieData = categories.map((cat) => {
            const xMap = dataMap.get(cat)!;
            const val = Array.from(xMap.values()).reduce((a, b) => a + b, 0);
            return { name: cat, value: val };
        });

        return {
            tooltip: { trigger: 'item' },
            legend: { top: 'bottom' },
            series: [
                {
                    name: w.title,
                    type: 'pie',
                    radius: w.chartType === 'donut' ? ['40%', '70%'] : '70%',
                    data: pieData,
                },
            ],
        };
    }

    const series = groupList.map((gName) => {
        const sData = categories.map((cat) => dataMap.get(cat)?.get(gName) || 0);
        const isLine = w.chartType === 'line' || w.chartType === 'area';
        return {
            name: gName,
            type: (isLine ? 'line' : 'bar') as 'line' | 'bar',
            stack: w.chartType === 'stacked_bar' ? 'total' : undefined,
            data: sData,
            areaStyle: w.chartType === 'area' ? { opacity: 0.3 } : undefined,
        };
    });

    return {
        tooltip: { trigger: 'axis' },
        legend: { top: 'top' },
        grid: { left: 50, right: 30, top: 60, bottom: 60, containLabel: true },
        xAxis: { 
            type: 'category', 
            data: categories,
            axisLabel: {
                rotate: categories.length > 5 ? 35 : 0,
                interval: 0,
                hideOverlap: true,
                overflow: 'break',
                width: 80
            }
        },
        yAxis: { type: 'value', minInterval: 1 },
        series,
    };
};

export const getEmptyTitle = (hasData: boolean, emptyText: string): TitleComponentOption | undefined => {
    return hasData
        ? undefined
        : {
            text: emptyText,
            left: 'center',
            top: 'middle',
            textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
        };
};

export const buildBasicCategoryOption = (args: {
    categories: string[];
    values: number[];
    seriesName: string;
    chartType: ChartType;
    color?: string;
    colors?: string[];
    emptyText: string;
    numberLabel?: string;
    rotateXAxis?: boolean;
}): EChartsOption => {
    const {
        categories,
        values,
        seriesName,
        chartType,
        color = '#3b82f6',
        colors,
        emptyText,
        numberLabel,
        rotateXAxis,
    } = args;

    const hasData = categories.length > 0 && values.some((v) => Number(v) > 0);
    const emptyTitle = getEmptyTitle(hasData, emptyText);
    const isPie = chartType === 'pie' || chartType === 'donut';
    const isNumber = chartType === 'number';
    const isLollipop = chartType === 'lollipop';
    const isArea = chartType === 'area';
    const isLine = chartType === 'line' || chartType === 'burnup' || chartType === 'burndown' || isArea;
    const seriesType: 'bar' | 'line' = isLine ? 'line' : 'bar';
    const totalValue = values.reduce((acc, v) => acc + (Number(v) || 0), 0);

    if (isNumber) {
        return {
            title: emptyTitle,
            tooltip: { show: false },
            grid: { left: 0, right: 0, top: 0, bottom: 0 },
            xAxis: { show: false },
            yAxis: { show: false },
            series: [],
            graphic: hasData
                ? [
                    {
                        type: 'text',
                        left: 'center',
                        top: '45%',
                        style: {
                            text: `${totalValue}`,
                            fontSize: 56,
                            fontWeight: 700,
                            fill: '#111827',
                        },
                    },
                    {
                        type: 'text',
                        left: 'center',
                        top: '55%',
                        style: {
                            text: numberLabel || seriesName,
                            fontSize: 14,
                            fontWeight: 500,
                            fill: '#6b7280',
                        },
                        silent: true,
                        z: 10,
                    },
                ]
                : [],
        };
    }

    if (isPie) {
        return {
            title: emptyTitle,
            tooltip: { trigger: 'item' },
            legend: { top: 'bottom' },
            series: [
                {
                    name: seriesName,
                    type: 'pie',
                    radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
                    avoidLabelOverlap: true,
                    label: { show: true, formatter: '{b}: {c}' },
                    data: categories.map((name, idx) => {
                        const itemColor = colors?.[idx];
                        return itemColor
                            ? { name, value: values[idx] ?? 0, itemStyle: { color: itemColor } }
                            : { name, value: values[idx] ?? 0 };
                    }),
                },
            ],
        };
    }

    return {
        title: emptyTitle,
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 20, top: 30, bottom: 60, containLabel: true },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: rotateXAxis ? { 
                rotate: categories.length > 5 ? 45 : 30,
                interval: 0,
                overflow: 'break',
                width: 80,
                hideOverlap: true
            } : undefined,
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            scale: true,
        },
        series: isLollipop
            ? [
                {
                    name: seriesName,
                    data: values,
                    type: 'bar',
                    barWidth: 2,
                    itemStyle: {
                        color: (params: any) => colors?.[params?.dataIndex] || color,
                    },
                },
                {
                    name: seriesName,
                    data: values,
                    type: 'scatter',
                    symbolSize: 12,
                    itemStyle: {
                        color: (params: any) => colors?.[params?.dataIndex] || color,
                    },
                },
            ]
            : [
                {
                    name: seriesName,
                    data: values,
                    type: seriesType,
                    stack: chartType === 'stacked_bar' ? 'total' : undefined,
                    barMaxWidth: 50,
                    smooth: seriesType === 'line',
                    symbolSize: 8,
                    itemStyle: {
                        color: (params: any) => colors?.[params?.dataIndex] || color,
                    },
                    lineStyle: { color, width: 3 },
                    areaStyle: isArea ? { opacity: 0.25 } : undefined,
                },
            ],
    };
};

export const CHART_TYPE_OPTIONS = [
    { value: 'bar' as ChartType, label: 'Bar Chart' },
    { value: 'line' as ChartType, label: 'Line Chart' },
    { value: 'pie' as ChartType, label: 'Pie Chart' },
    { value: 'donut' as ChartType, label: 'Donut Chart' },
];

export const ADD_WIDGET_CHART_TYPE_OPTIONS = [
    { value: 'bar' as ChartType, label: 'Bar Chart' },
    { value: 'line' as ChartType, label: 'Line Chart' },
    { value: 'area' as ChartType, label: 'Area Chart' },
    { value: 'pie' as ChartType, label: 'Pie Chart' },
    { value: 'donut' as ChartType, label: 'Donut Chart' },
    { value: 'stacked_bar' as ChartType, label: 'Stacked Bar' },
];

export const DIMENSION_OPTIONS = [
    { value: 'status' as DimensionKey, label: 'Status' },
    { value: 'priority' as DimensionKey, label: 'Priority' },
    { value: 'company' as DimensionKey, label: 'Company' },
    { value: 'brand' as DimensionKey, label: 'Brand' },
    { value: 'assignee' as DimensionKey, label: 'Assignee' },
    { value: 'creator' as DimensionKey, label: 'Creator' },
    { value: 'task_type' as DimensionKey, label: 'Task Type' },
    { value: 'section' as DimensionKey, label: 'Section' },
    { value: 'created_month' as DimensionKey, label: 'Created Month' },
    { value: 'due_month' as DimensionKey, label: 'Due Month' },
];

export const getAutoWidgetTitle = (w: { xAxis: DimensionKey; groupBy: DimensionKey | 'none'; metrics: string[] }): string => {
    const xLabel = DIMENSION_OPTIONS.find(o => o.value === w.xAxis)?.label || w.xAxis;
    const gLabel = w.groupBy !== 'none' ? ` by ${DIMENSION_OPTIONS.find(o => o.value === w.groupBy)?.label || w.groupBy}` : '';
    return `${xLabel}${gLabel}`;
};
