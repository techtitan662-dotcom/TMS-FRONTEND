import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import { Trash2, PlusCircle, Filter, Calendar, Building2, BarChart3, CheckCircle2, Clock, AlertCircle, Users, Download, CalendarClock } from 'lucide-react';
import ManagerAnalysisChart from '../Components/ManagerAnalysisChart';
import type { Task } from '../Types/Types';

type ChartType =
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

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar' },
    { value: 'column', label: 'Column' },
    { value: 'stacked_bar', label: 'Stacked bar' },
    { value: 'grouped_bar', label: 'Grouped bar' },
    { value: 'clustered_bar', label: 'Clustered bar charts' },
    { value: 'line', label: 'Line' },
    { value: 'area', label: 'Area' },
    { value: 'burnup', label: 'Burnup' },
    { value: 'burndown', label: 'Burndown' },
    { value: 'pie', label: 'Pie' },
    { value: 'donut', label: 'Donut' },
    { value: 'number', label: 'Number' },
    { value: 'lollipop', label: 'Lollipop' },
];

const ADD_WIDGET_CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
    ...CHART_TYPE_OPTIONS,
    { value: 'bar_label_rotation', label: 'Bar (label rotation)' },
];

type DimensionKey =
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

const DIMENSION_OPTIONS: { value: DimensionKey; label: string }[] = [
    { value: 'assignee', label: 'Assignee' },
    { value: 'assignee_role', label: 'Assignee role' },
    { value: 'creator', label: 'Creator' },
    { value: 'task_type', label: 'Task type' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'company', label: 'Company' },
    { value: 'brand', label: 'Brand' },
    { value: 'created_day', label: 'Created date (Day)' },
    { value: 'created_month', label: 'Created month' },
    { value: 'created_year', label: 'Created year' },
    { value: 'created_year_range', label: 'Created year (Range)' },
    { value: 'due_day', label: 'Due date (Day)' },
    { value: 'due_month', label: 'Due month' },
    { value: 'due_year', label: 'Due year' },
    { value: 'due_year_range', label: 'Due year (Range)' },
    { value: 'completed_day', label: 'Completed date (Day)' },
    { value: 'completed_month', label: 'Completed month' },
    { value: 'completed_year', label: 'Completed year' },
    { value: 'completed_year_range', label: 'Completed year (Range)' },
];

const CUSTOM_WIDGETS_STORAGE_KEY = 'analyze_custom_widgets_v1';
const HIDDEN_BUILTIN_CHARTS_STORAGE_KEY = 'analyze_hidden_builtin_charts_v1';
const HIDDEN_CUSTOM_WIDGETS_STORAGE_KEY = 'analyze_hidden_custom_widgets_v1';

const BUILTIN_CHARTS: { key: string; label: string }[] = [
    { key: 'assign_by', label: 'Assign By' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'completion_trends', label: 'Completion trends' },
    { key: 'manager_analysis', label: 'Manager analysis' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'status_breakdown', label: 'Status breakdown' },
    { key: 'overdue_by_company', label: 'Overdue by company' },
];

type YEntity = 'task' | 'time' | 'time_entry' | 'custom_field' | 'budget' | 'cost' | 'revenue';

type MetricKey =
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

const TASK_METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    { value: 'count', label: 'Total' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
];

const TIME_METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    { value: 'time_to_complete_hours', label: 'Time to complete (hours)' },
    { value: 'estimated_hours', label: 'Estimated hours' },
    { value: 'actual_time_hours', label: 'Actual time (hours)' },
];

const TIME_ENTRY_METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    { value: 'actual_time_hours', label: 'Actual time (hours)' },
    { value: 'efficiency', label: 'Efficiency %' },
];

const CUSTOM_FIELD_METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    { value: 'custom_field_time_hours', label: 'Time in custom field (hours)' },
];

const FINANCIAL_METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    { value: 'budget_amount', label: 'Budget Amount' },
    { value: 'actual_cost', label: 'Actual Cost' },
    { value: 'revenue_amount', label: 'Revenue Amount' },
    { value: 'profit', label: 'Profit' },
];

const METRIC_OPTIONS_BY_ENTITY: Record<YEntity, { value: MetricKey; label: string }[]> = {
    task: TASK_METRIC_OPTIONS,
    time: TIME_METRIC_OPTIONS,
    time_entry: TIME_ENTRY_METRIC_OPTIONS,
    custom_field: CUSTOM_FIELD_METRIC_OPTIONS,
    budget: FINANCIAL_METRIC_OPTIONS,
    cost: FINANCIAL_METRIC_OPTIONS,
    revenue: FINANCIAL_METRIC_OPTIONS,
};

const ALL_METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    ...TASK_METRIC_OPTIONS,
    ...TIME_METRIC_OPTIONS,
    ...TIME_ENTRY_METRIC_OPTIONS,
    ...CUSTOM_FIELD_METRIC_OPTIONS,
    ...FINANCIAL_METRIC_OPTIONS,
];

type CustomWidget = {
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

export interface AnalyzePageProps {
    tasks: Task[];
    currentUserEmail?: string;
    currentUserRole?: string;
}

const AnalyzePage: FC<AnalyzePageProps> = ({ tasks, currentUserEmail: currentUserEmailProp, currentUserRole }) => {
    const navigate = useNavigate();
    const chartRef = useRef<HTMLDivElement | null>(null);
    const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const assignedChartRef = useRef<HTMLDivElement | null>(null);
    const assignedChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const assignedToChartRef = useRef<HTMLDivElement | null>(null);
    const assignedToChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const trendsChartRef = useRef<HTMLDivElement | null>(null);
    const trendsChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const leaderboardChartRef = useRef<HTMLDivElement | null>(null);
    const leaderboardChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const performanceChartRef = useRef<HTMLDivElement | null>(null);
    const performanceChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const overdueByCompanyChartRef = useRef<HTMLDivElement | null>(null);
    const overdueByCompanyChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [assignedChartType, setAssignedChartType] = useState<ChartType>('pie');
    const [assignedToChartType, setAssignedToChartType] = useState<ChartType>('bar');
    const [trendsGranularity, setTrendsGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [trendsStartDate, setTrendsStartDate] = useState<string>('');
    const [trendsEndDate, setTrendsEndDate] = useState<string>('');
    const [trendsAssignee, setTrendsAssignee] = useState<string>('all');
    const [trendsCompany, setTrendsCompany] = useState<string>('all');
    const [trendsBrand, setTrendsBrand] = useState<string>('all');
    const [leaderboardMetric, setLeaderboardMetric] = useState<'completed' | 'rate'>('completed');
    const [leaderboardStartDate, setLeaderboardStartDate] = useState<string>('');
    const [leaderboardEndDate, setLeaderboardEndDate] = useState<string>('');
    const [leaderboardCompany, setLeaderboardCompany] = useState<string>('all');
    const [leaderboardBrand, setLeaderboardBrand] = useState<string>('all');
    const [leaderboardTopN, setLeaderboardTopN] = useState<number>(5);
    const [performanceGroupBy, setPerformanceGroupBy] = useState<'company' | 'brand'>('company');
    const [performanceStartDate, setPerformanceStartDate] = useState<string>('');
    const [performanceEndDate, setPerformanceEndDate] = useState<string>('');
    
    // Global Filters
    const [globalCompany, setGlobalCompany] = useState<string>('all');
    const [globalTimePeriod, setGlobalTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all' | 'custom'>('all');
    const [globalMonth, setGlobalMonth] = useState<string>(new Date().toISOString().substring(0, 7));
    const [globalStartDate, setGlobalStartDate] = useState<string>('');
    const [globalEndDate, setGlobalEndDate] = useState<string>('');
    const [globalDateField, setGlobalDateField] = useState<'createdAt' | 'dueDate' | 'completedAt' | 'updatedAt'>('createdAt');
    const [reportFilterCompany, setReportFilterCompany] = useState<string>('all');
    const [overdueChartCompany, setOverdueChartCompany] = useState<string>('all');

    const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([]);
    const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
    const [hiddenBuiltinCharts, setHiddenBuiltinCharts] = useState<string[]>([]);
    const [hiddenCustomWidgetIds, setHiddenCustomWidgetIds] = useState<string[]>([]);
    const [newWidgetTitle, setNewWidgetTitle] = useState('');
    const [newWidgetChartType, setNewWidgetChartType] = useState<ChartType>('bar');
    const [newWidgetXAxis, setNewWidgetXAxis] = useState<DimensionKey>('task_type');
    const [newWidgetGroupBy, setNewWidgetGroupBy] = useState<DimensionKey | 'none'>('status');
    const [newWidgetMetrics, setNewWidgetMetrics] = useState<MetricKey[]>(['count']);
    const [newWidgetShowPercent, setNewWidgetShowPercent] = useState(false);
    const [newWidgetFilterStatus, setNewWidgetFilterStatus] = useState<
        'all' | 'completed' | 'pending' | 'in-progress' | 'on-hold' | 'cancelled'
    >('all');
    const [newWidgetFilterPriority, setNewWidgetFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
    const [newWidgetFilterAssignee, setNewWidgetFilterAssignee] = useState<string>('all');
    const [newWidgetFilterTaskType, setNewWidgetFilterTaskType] = useState<string>('all');
    const [newWidgetFilterCompany, setNewWidgetFilterCompany] = useState<string>('all');
    const [newWidgetFilterBrand, setNewWidgetFilterBrand] = useState<string>('all');
    const [newWidgetDateField, setNewWidgetDateField] = useState<'createdAt' | 'dueDate' | 'completedAt' | 'updatedAt'>('createdAt');
    const [newWidgetStartDate, setNewWidgetStartDate] = useState<string>('');
    const [newWidgetEndDate, setNewWidgetEndDate] = useState<string>('');
    const addWidgetPreviewRef = useRef<HTMLDivElement | null>(null);
    const addWidgetPreviewChartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const customWidgetDomRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const customWidgetChartRef = useRef<Map<string, ReturnType<typeof echarts.init>>>(new Map());

    const [additionalMetrics, setAdditionalMetrics] = useState<{ value: string; label: string }[]>([
        // Custom metrics will be added here
    ]);
    const [showAddMetricModal, setShowAddMetricModal] = useState(false);
    const [newMetricLabel, setNewMetricLabel] = useState(''); // Only display label

    const getInitialRecommended = () => {
        if (typeof window === 'undefined') return { cols: 2, reason: 'Default' };
        const w = window.innerWidth;
        if (w < 768) return { cols: 1, reason: 'Narrow screen, 1 chart per row best' };
        if (w < 1024) return { cols: 2, reason: 'Comfortable for 2 charts' };
        if (w < 1280) return { cols: 3, reason: 'Good fit for 3 charts' };
        return { cols: 4, reason: 'Plenty of space for 4 charts' };
    };

    const initRec = getInitialRecommended();
    const [chartsPerRow, setChartsPerRow] = useState<1 | 2 | 3 | 4>(initRec.cols as 1 | 2 | 3 | 4);
    const [recommendCols, setRecommendCols] = useState<number>(initRec.cols);
    const [recommendReason, setRecommendReason] = useState<string>(initRec.reason);
    const [userHasChangedChartsPerRow, setUserHasChangedChartsPerRow] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    const isAdminUser = useMemo(() => {
        const r = (currentUserRole || '').toString().trim().toLowerCase();
        return r === 'admin' || r === 'super admin' || r === 'superadmin';
    }, [currentUserRole]);

    const storageUserKey = useMemo(() => {
        const raw = (currentUserEmailProp || '').toString().trim().toLowerCase();
        return raw || 'anonymous';
    }, [currentUserEmailProp]);

    const hiddenBuiltinStorageKey = useMemo(() => {
        return `${HIDDEN_BUILTIN_CHARTS_STORAGE_KEY}::${storageUserKey}`;
    }, [storageUserKey]);

    const hiddenCustomStorageKey = useMemo(() => {
        return `${HIDDEN_CUSTOM_WIDGETS_STORAGE_KEY}::${storageUserKey}`;
    }, [storageUserKey]);

    const normalizeText = (v: unknown): string => (v || '').toString().trim();
    const normalizeStatusForFilter = (v: string): string => {
        const s = (v || '').toString().trim().toLowerCase();
        if (s === 'in progress' || s === 'in_progress' || s === 'in-progress') return 'in-progress';
        return s;
    };

    const getCompletionStatus = (t: Task): string => {
        const status = normalizeText((t as any)?.status || '');
        if (status === 'completed') return 'Completed';

        const due = new Date(normalizeText((t as any)?.dueDate));
        if (Number.isNaN(due.getTime())) return 'Unscheduled';

        const now = new Date();
        if (due.getTime() < now.getTime()) return 'Overdue';
        return 'Upcoming';
    };

    const getDimensionLabel = (key: DimensionKey): string => {
        return DIMENSION_OPTIONS.find((o) => o.value === key)?.label || key;
    };

    const stripDeletedEmailSuffix = (raw: string): string => {
        const s = (raw || '').toString().trim();
        if (!s) return '';
        const idx = s.toLowerCase().indexOf('.deleted.');
        if (idx === -1) return s;
        return s.slice(0, idx);
    };

    const extractUserLabel = (value: unknown, nameHint?: unknown): string => {
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

    const getMetricLabel = (metric: MetricKey): string => {
        // First check additional metrics
        const customMetric = additionalMetrics.find((m) => m.value === metric);
        if (customMetric) return customMetric.label;

        // Then check standard options
        return ALL_METRIC_OPTIONS.find((o) => o.value === metric)?.label || metric;
    };

    const getAutoWidgetTitle = (args: {
        xAxis: DimensionKey;
        groupBy: DimensionKey | 'none';
        metrics: MetricKey[];
    }): string => {
        const safe = Array.isArray(args.metrics) && args.metrics.length ? args.metrics : (['count'] as MetricKey[]);
        const metricLabel = safe.map((m) => getMetricLabel(m)).join(', ');
        return `Total tasks by ${getDimensionLabel(args.xAxis)}${args.groupBy === 'none' ? '' : ` and ${getDimensionLabel(args.groupBy)}`
            } (${metricLabel})`;
    };

    const getMetricValue = (t: Task, yEntity: YEntity, metric: MetricKey): number | null => {
        if (yEntity === 'task') {
            if (metric === 'count') return 1;

            const status = normalizeText((t as any)?.status || '');
            if (metric === 'completed') return status === 'completed' ? 1 : null;
            if (metric === 'pending') return status === 'pending' ? 1 : null;
            if (metric === 'in_progress') return status === 'in-progress' ? 1 : null;
            if (metric === 'on_hold') return status === 'on-hold' ? 1 : null;
            if (metric === 'cancelled') return status === 'cancelled' ? 1 : null;

            const completion = getCompletionStatus(t);
            if (metric === 'overdue') return completion === 'Overdue' ? 1 : null;
            if (metric === 'upcoming') return completion === 'Upcoming' ? 1 : null;
            if (metric === 'unscheduled') return completion === 'Unscheduled' ? 1 : null;

            // Check additional custom metrics
            const isCustomMetric = additionalMetrics.some(m => m.value === metric);
            if (isCustomMetric) {
                const customMetricValue = (t as any)?.[metric];
                if (customMetricValue !== undefined) {
                    const num = Number(customMetricValue);
                    return Number.isFinite(num) ? num : null;
                }
            }

            return null;
        }

        if (yEntity === 'time' && metric === 'time_to_complete_hours') {
            const status = normalizeText((t as any)?.status || '');
            if (status !== 'completed') return null;
            const createdAt = new Date(normalizeText((t as any)?.createdAt));
            const updatedAt = new Date(normalizeText((t as any)?.updatedAt));
            if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) return null;
            const ms = updatedAt.getTime() - createdAt.getTime();
            if (ms <= 0) return null;
            return ms / (1000 * 60 * 60);
        }

        if (yEntity === 'time_entry' && metric === 'actual_time_hours') {
            const candidate =
                (t as any)?.actualTimeHours ??
                (t as any)?.timeSpentHours ??
                (t as any)?.actualTime ??
                (t as any)?.timeSpent;
            const n = Number(candidate);
            return Number.isFinite(n) && n > 0 ? n : null;
        }

        if (yEntity === 'custom_field' && metric === 'custom_field_time_hours') {
            const candidate = (t as any)?.customFieldTimeHours ?? (t as any)?.customFieldTime;
            const n = Number(candidate);
            return Number.isFinite(n) && n > 0 ? n : null;
        }

        if (yEntity === 'budget' || yEntity === 'cost' || yEntity === 'revenue') {
            const candidate = (t as any)?.[metric] ?? (t as any)?.[`${yEntity}_${metric}`];
            const n = Number(candidate);
            return Number.isFinite(n) ? n : null;
        }

        return null;
    };

    const formatYear = (raw: unknown): string => {
        const d = new Date(normalizeText(raw));
        if (Number.isNaN(d.getTime())) return 'Unknown';
        return `${d.getFullYear()}`;
    };

    const formatYearRange = (raw: unknown): string => {
        const d = new Date(normalizeText(raw));
        if (Number.isNaN(d.getTime())) return 'Unknown';
        const y = d.getFullYear();
        return `${y}-${y + 1}`;
    };

    const formatMonth = (raw: unknown): string => {
        const d = new Date(normalizeText(raw));
        if (Number.isNaN(d.getTime())) return 'Unknown';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const formatDay = (raw: unknown): string => {
        const d = new Date(normalizeText(raw));
        if (Number.isNaN(d.getTime())) return 'Unknown';
        return d.toISOString().slice(0, 10);
    };

    const formatWeek = (raw: unknown): string => {
        const d = new Date(normalizeText(raw));
        if (Number.isNaN(d.getTime())) return 'Unknown';
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const getDimensionValue = (t: Task, key: DimensionKey): string => {
        if (key === 'assignee') return extractUserLabel((t as any)?.assignedTo, (t as any)?.assignedToName);
        if (key === 'assignee_role') return normalizeText((t as any)?.assignedTo?.role) || 'Unknown';
        if (key === 'creator') return extractUserLabel((t as any)?.assignedBy, (t as any)?.assignedByName);
        if (key === 'creator_role') return normalizeText((t as any)?.assignedBy?.role) || 'Unknown';
        if (key === 'section') return normalizeText((t as any)?.category) || 'Unknown';
        if (key === 'task_type') return normalizeText((t as any)?.taskType || (t as any)?.type) || 'Unknown';
        if (key === 'tag') {
            const tags = (t as any)?.tags;
            if (Array.isArray(tags) && tags.length) {
                const first = normalizeText(tags[0]);
                return first || 'Unknown';
            }
            return 'No tag';
        }
        if (key === 'completion_status') return getCompletionStatus(t);
        if (key === 'status') return normalizeText((t as any)?.status);
        if (key === 'priority') return normalizeText((t as any)?.priority);
        if (key === 'company') return normalizeText((t as any)?.companyName || (t as any)?.company) || 'Unknown';
        if (key === 'brand') return normalizeText((t as any)?.brand) || 'Unknown';
        if (key === 'project') return normalizeText((t as any)?.project) || 'Unknown';
        if (key === 'created_day') return formatDay((t as any)?.createdAt);
        if (key === 'created_week') return formatWeek((t as any)?.createdAt);
        if (key === 'created_month') return formatMonth((t as any)?.createdAt);
        if (key === 'created_year') return formatYear((t as any)?.createdAt);
        if (key === 'created_year_range') return formatYearRange((t as any)?.createdAt);
        if (key === 'due_day') return formatDay((t as any)?.dueDate);
        if (key === 'due_week') return formatWeek((t as any)?.dueDate);
        if (key === 'due_month') return formatMonth((t as any)?.dueDate);
        if (key === 'due_year') return formatYear((t as any)?.dueDate);
        if (key === 'due_year_range') return formatYearRange((t as any)?.dueDate);
        if (key === 'completed_day') {
            const completedAt = (t as any)?.completedAt || ((t as any)?.status === 'completed' ? (t as any)?.updatedAt : '');
            return formatDay(completedAt);
        }
        if (key === 'completed_week') {
            const completedAt = (t as any)?.completedAt || ((t as any)?.status === 'completed' ? (t as any)?.updatedAt : '');
            return formatWeek(completedAt);
        }
        if (key === 'completed_month') {
            const completedAt = (t as any)?.completedAt || ((t as any)?.status === 'completed' ? (t as any)?.updatedAt : '');
            return formatMonth(completedAt);
        }
        if (key === 'completed_year') {
            const completedAt = (t as any)?.completedAt || ((t as any)?.status === 'completed' ? (t as any)?.updatedAt : '');
            return formatYear(completedAt);
        }
        if (key === 'completed_year_range') {
            const completedAt = (t as any)?.completedAt || ((t as any)?.status === 'completed' ? (t as any)?.updatedAt : '');
            return formatYearRange(completedAt);
        }
        if (key === 'department') return normalizeText((t as any)?.department) || 'Unknown';
        if (key === 'team') return normalizeText((t as any)?.team) || 'Unknown';
        if (key === 'location') return normalizeText((t as any)?.location) || 'Unknown';
        if (key === 'phase') return normalizeText((t as any)?.phase) || 'Unknown';
        if (key === 'milestone') return normalizeText((t as any)?.milestone) || 'Unknown';
        if (key === 'sprint') return normalizeText((t as any)?.sprint) || 'Unknown';
        return 'Unknown';
    };

    const companies = useMemo(() => {
        const map = new Map<string, string>();
        (tasks || []).forEach((t: any) => {
            const raw = normalizeText(t.companyName || t.company);
            if (!raw) return;
            const key = raw.toLowerCase();
            // Keep the version that has more uppercase letters, or just the first one.
            // Actually, let's just keep the first one but prefer one with capital letters if possible.
            if (!map.has(key)) {
                map.set(key, raw);
            } else {
                const existing = map.get(key)!;
                // If the new one has more uppercase letters, it might be the "official" name
                const existingUpper = (existing.match(/[A-Z]/g) || []).length;
                const newUpper = (raw.match(/[A-Z]/g) || []).length;
                if (newUpper > existingUpper) {
                    map.set(key, raw);
                }
            }
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }, [tasks]);

    const effectiveDateRange = useMemo(() => {
        if (globalTimePeriod === 'all') return { start: '', end: '' };
        if (globalTimePeriod === 'custom') return { start: globalStartDate, end: globalEndDate };

        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (globalTimePeriod === 'daily') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (globalTimePeriod === 'weekly') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (globalTimePeriod === 'monthly') {
            const [year, month] = globalMonth.split('-').map(Number);
            start.setFullYear(year, month - 1, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(year, month, 0);
            end.setHours(23, 59, 59, 999);
        }

        const formatDate = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        return { start: formatDate(start), end: formatDate(end) };
    }, [globalTimePeriod, globalStartDate, globalEndDate]);

    const filteredTasksByGlobalDates = useMemo(() => {
        let list = tasks || [];

        // Filter by Company
        if (globalCompany !== 'all') {
            list = list.filter((t: any) => {
                const c = normalizeText(t.companyName || t.company).toLowerCase();
                return c === globalCompany.toLowerCase();
            });
        }

        // Filter by Date Range
        const { start, end } = effectiveDateRange;
        if (start || end) {
            list = list.filter((t: any) => {
                const dateVal = t[globalDateField];
                if (!dateVal) return false;
                const d = new Date(dateVal).getTime();
                if (start) {
                    const s = new Date(start).getTime();
                    if (d < s) return false;
                }
                if (end) {
                    const e = new Date(end).setHours(23, 59, 59, 999);
                    if (d > e) return false;
                }
                return true;
            });
        }

        return list;
    }, [tasks, globalCompany, effectiveDateRange, globalDateField]);

    const globalSummary = useMemo(() => {
        const total = filteredTasksByGlobalDates.length;
        const completed = filteredTasksByGlobalDates.filter((t: any) => normalizeText(t.status).toLowerCase() === 'completed').length;
        const pending = filteredTasksByGlobalDates.filter((t: any) => normalizeText(t.status).toLowerCase() === 'pending').length;
        const inProgress = filteredTasksByGlobalDates.filter((t: any) => normalizeStatusForFilter(t.status) === 'in-progress').length;
        const overdue = filteredTasksByGlobalDates.filter((t) => getCompletionStatus(t) === 'Overdue').length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, pending, inProgress, overdue, rate };
    }, [filteredTasksByGlobalDates]);

    const smartInsights = useMemo(() => {
        if (!filteredTasksByGlobalDates.length) return null;

        // Bottleneck detection (Status)
        const statusMap: Record<string, number> = {};
        const typeMap: Record<string, number> = {};
        const userMap: Record<string, number> = {};
        const priorityMap: Record<string, number> = {};
        let overdueHighPriority = 0;

        filteredTasksByGlobalDates.forEach((t: any) => {
            const s = normalizeText(t.status).toLowerCase();
            const p = normalizeText(t.priority).toLowerCase();

            if (s !== 'completed') statusMap[s] = (statusMap[s] || 0) + 1;
            if (p) priorityMap[p] = (priorityMap[p] || 0) + 1;
            if (p === 'high' || p === 'urgent') {
                if (getCompletionStatus(t) === 'Overdue') {
                    overdueHighPriority++;
                }
            }

            const type = normalizeText(t.taskType || t.type);
            if (type) typeMap[type] = (typeMap[type] || 0) + 1;

            if (s === 'completed') {
                const u = extractUserLabel(t.assignedTo, t.assignedToName);
                if (u && u !== 'Unknown') userMap[u] = (userMap[u] || 0) + 1;
            }
        });

        const getTop = (map: Record<string, number>) => {
            let max = 0;
            let topKey = '';
            for (const k in map) {
                if (map[k] > max) {
                    max = map[k];
                    topKey = k;
                }
            }
            return { key: topKey, value: max };
        };

        const topStatus = getTop(statusMap);
        const topType = getTop(typeMap);
        const topUser = getTop(userMap);
        const topPriority = getTop(priorityMap);

        let health = 'Good';
        if (globalSummary.rate < 30) health = 'Critical';
        else if (globalSummary.rate < 60) health = 'Attention Needed';

        return {
            health,
            bottleneckStatus: topStatus.key,
            bottleneckType: topType.key,
            topPerformer: topUser.key,
            performerCount: topUser.value,
            topPriority: topPriority.key,
            overdueHighPriority,
            companyName: globalCompany === 'all' ? 'Across all companies' : `For ${globalCompany}`,
        };
    }, [filteredTasksByGlobalDates, globalSummary, globalCompany]);

    const userReportData = useMemo(() => {
        const userMap: Record<string, { name: string; total: number; completed: number; pending: number; overdue: number; overdueCompleted: number }> = {};
        
        let reportTasks = filteredTasksByGlobalDates;
        if (reportFilterCompany !== 'all') {
            reportTasks = reportTasks.filter(t => {
                const c = normalizeText(t.companyName || t.company).toLowerCase();
                return c === reportFilterCompany.toLowerCase();
            });
        }

        reportTasks.forEach(t => {
            const u = extractUserLabel(t.assignedTo, t.assignedToName) || 'Unassigned';
            if (!userMap[u]) {
                userMap[u] = { name: u, total: 0, completed: 0, pending: 0, overdue: 0, overdueCompleted: 0 };
            }
            
            userMap[u].total++;
            const status = normalizeText(t.status).toLowerCase();
            if (status === 'completed') userMap[u].completed++;
            else if (status === 'pending') userMap[u].pending++;
            
            if (getCompletionStatus(t) === 'Overdue') {
                userMap[u].overdue++;
            }

            if (status === 'completed') {
                const completedAtRaw = (t as any)?.completedAt || (t as any)?.updatedAt;
                const dueDateRaw = (t as any)?.dueDate;
                if (completedAtRaw && dueDateRaw) {
                    const completedAt = new Date(normalizeText(completedAtRaw));
                    const dueDate = new Date(normalizeText(dueDateRaw));
                    if (!isNaN(completedAt.getTime()) && !isNaN(dueDate.getTime()) && completedAt.getTime() > dueDate.getTime()) {
                        userMap[u].overdueCompleted++;
                    }
                }
            }
        });
        
        return Object.values(userMap)
            .map(u => ({
                ...u,
                rate: u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0
            }))
            .sort((a, b) => b.completed - a.completed || b.total - a.total);
    }, [filteredTasksByGlobalDates, reportFilterCompany]);

    const handleExportReport = () => {
        if (!userReportData.length) return;
        
        const headers = ['User', 'Total Tasks', 'Completed', 'Pending', 'Overdue', 'Overdue Completed', 'Success Rate (%)'];
        const rows = userReportData.map(r => [
            r.name,
            r.total,
            r.completed,
            r.pending,
            r.overdue,
            r.overdueCompleted,
            r.rate
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `User_Performance_Report_${reportFilterCompany === 'all' ? 'All' : reportFilterCompany}_${globalMonth}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const overdueByCompany = useMemo(() => {
        const counts: Record<string, number> = {};
        
        filteredTasksByGlobalDates.forEach(t => {
            if (getCompletionStatus(t) === 'Overdue') {
                const taskCompany = normalizeText(t.companyName || t.company) || 'Unknown';
                if (overdueChartCompany !== 'all' && taskCompany.toLowerCase() !== overdueChartCompany.toLowerCase()) return;

                const u = extractUserLabel(t.assignedTo, t.assignedToName) || 'Unassigned';
                counts[u] = (counts[u] || 0) + 1;
            }
        });
        
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredTasksByGlobalDates, overdueChartCompany]);

    const appendQ = (prev: string, extra: string): string => {
        const p = (prev || '').trim();
        const e = (extra || '').trim();
        if (!p) return e;
        if (!e) return p;
        return `${p} ${e}`;
    };

    const navigateToTasks = (args: {
        q?: string;
        status?: string;
        priority?: string;
        assigned?: string;
        company?: string;
        brand?: string;
        taskType?: string;
        date?: string;
    }) => {
        const params = new URLSearchParams();
        if (args.q) params.set('q', args.q);
        if (args.status) params.set('status', args.status);
        if (args.priority) params.set('priority', args.priority);
        if (args.assigned) params.set('assigned', args.assigned);
        if (args.company) params.set('company', args.company);
        if (args.brand) params.set('brand', args.brand);
        if (args.taskType) params.set('taskType', args.taskType);
        if (args.date) params.set('date', args.date);
        const qs = params.toString();
        navigate(qs ? `/tasks?${qs}` : '/tasks');
    };

    const mapDimensionToFilters = (
        key: DimensionKey,
        rawValue: string,
    ): { q?: string; status?: string; priority?: string; company?: string; brand?: string; taskType?: string; date?: string } => {
        const v = (rawValue || '').toString().trim();
        if (!v) return {};

        if (key === 'status') {
            const s = normalizeStatusForFilter(v);
            if (s === 'completed' || s === 'pending' || s === 'in-progress' || s === 'on-hold' || s === 'cancelled') return { status: s };
            return { q: v };
        }
        if (key === 'priority') {
            const s = normalizeStatusForFilter(v);
            if (s === 'low' || s === 'medium' || s === 'high' || s === 'urgent') return { priority: s };
            return { q: v };
        }
        if (key === 'company') return { company: v };
        if (key === 'brand') return { brand: v };
        if (key === 'task_type') return { taskType: v };
        if (key === 'completion_status') {
            const s = (v || '').toString().trim().toLowerCase();
            if (s === 'overdue') return { date: 'overdue' };
            if (s === 'completed') return { status: 'completed' };
            return { q: v };
        }

        return { q: v };
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem(CUSTOM_WIDGETS_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;

            const validChartTypes = new Set([...CHART_TYPE_OPTIONS, ...ADD_WIDGET_CHART_TYPE_OPTIONS].map((o) => o.value));
            const validDimensions = new Set(DIMENSION_OPTIONS.map((o) => o.value));
            const validMetrics = new Set([...ALL_METRIC_OPTIONS.map((o) => o.value), ...additionalMetrics.map((m) => m.value)]);

            const safe = parsed
                .map((w: any): CustomWidget | null => {
                    const id = (w?.id || '').toString();
                    if (!id) return null;

                    const chartType = (w?.chartType || '').toString() as ChartType;
                    const xAxis = (w?.xAxis || '').toString() as DimensionKey;
                    const groupBy = ((w?.groupBy ?? 'none').toString() as DimensionKey | 'none') || 'none';
                    const yEntity = (w?.yEntity || 'task').toString() as YEntity;
                    const metric = (w?.metric || 'count').toString() as MetricKey;
                    const metricsRaw = Array.isArray(w?.metrics)
                        ? (w.metrics as unknown[]).map((m) => (m || '').toString()).filter(Boolean)
                        : [];
                    const metrics = (metricsRaw.length ? metricsRaw : [metric]).map((m) => m as MetricKey);

                    if (!validChartTypes.has(chartType)) return null;
                    if (!validDimensions.has(xAxis)) return null;
                    if (groupBy !== 'none' && !validDimensions.has(groupBy)) return null;
                    if (yEntity !== 'task' && yEntity !== 'time' && yEntity !== 'time_entry' && yEntity !== 'custom_field' && yEntity !== 'budget' && yEntity !== 'cost' && yEntity !== 'revenue') return null;
                    if (!validMetrics.has(metric)) return null;

                    const allowedMetrics = METRIC_OPTIONS_BY_ENTITY[yEntity] || [];
                    if (!allowedMetrics.some((m) => m.value === metric)) {
                        // Check if it's a custom metric
                        if (!additionalMetrics.some((m) => m.value === metric)) return null;
                    }

                    if (yEntity !== 'task') {
                        const ok = metrics.every((m) => allowedMetrics.some((a) => a.value === m));
                        if (!ok) return null;
                    }

                    const title = (w?.title || '').toString();

                    return {
                        id,
                        title,
                        chartType,
                        xAxis,
                        groupBy,
                        yEntity,
                        metric,
                        metrics,
                        showPercent: Boolean(w?.showPercent),
                        filters: w?.filters,
                    } as CustomWidget;
                })
                .filter((w): w is CustomWidget => w !== null);

            setCustomWidgets(safe);
        } catch {
            // ignore
        }
    }, [additionalMetrics]);

    useEffect(() => {
        try {
            localStorage.setItem(CUSTOM_WIDGETS_STORAGE_KEY, JSON.stringify(customWidgets));
        } catch {
            // ignore
        }
    }, [customWidgets]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(hiddenBuiltinStorageKey);
            if (!raw) {
                setHiddenBuiltinCharts([]);
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                setHiddenBuiltinCharts([]);
                return;
            }
            setHiddenBuiltinCharts(parsed.map((x: any) => String(x)));
        } catch {
            setHiddenBuiltinCharts([]);
        }
    }, [hiddenBuiltinStorageKey]);

    useEffect(() => {
        try {
            localStorage.setItem(hiddenBuiltinStorageKey, JSON.stringify(hiddenBuiltinCharts));
        } catch {
            // ignore
        }
    }, [hiddenBuiltinCharts, hiddenBuiltinStorageKey]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(hiddenCustomStorageKey);
            if (!raw) {
                setHiddenCustomWidgetIds([]);
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                setHiddenCustomWidgetIds([]);
                return;
            }
            setHiddenCustomWidgetIds(parsed.map((x: any) => String(x)));
        } catch {
            setHiddenCustomWidgetIds([]);
        }
    }, [hiddenCustomStorageKey]);

    useEffect(() => {
        try {
            localStorage.setItem(hiddenCustomStorageKey, JSON.stringify(hiddenCustomWidgetIds));
        } catch {
            // ignore
        }
    }, [hiddenCustomWidgetIds, hiddenCustomStorageKey]);

    const hiddenBuiltinSet = useMemo(() => new Set(hiddenBuiltinCharts), [hiddenBuiltinCharts]);
    const hiddenCustomWidgetSet = useMemo(() => new Set(hiddenCustomWidgetIds), [hiddenCustomWidgetIds]);

    const toggleBuiltinChart = (chartKey: string) => {
        if (!isAdminUser) return;
        setHiddenBuiltinCharts((prev) => {
            if (prev.includes(chartKey)) return prev.filter((k) => k !== chartKey);
            return [...prev, chartKey];
        });
    };

    const toggleCustomWidgetHidden = (widgetId: string) => {
        if (!isAdminUser) return;
        setHiddenCustomWidgetIds((prev) => {
            if (prev.includes(widgetId)) return prev.filter((id) => id !== widgetId);
            return [...prev, widgetId];
        });
    };

    const getEmptyTitle = (hasData: boolean, emptyText: string): echarts.TitleComponentOption | undefined => {
        return hasData
            ? undefined
            : {
                text: emptyText,
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
            };
    };

    const buildBasicCategoryOption = (args: {
        categories: string[];
        values: number[];
        seriesName: string;
        chartType: ChartType;
        color?: string;
        colors?: string[];
        emptyText: string;
        numberLabel?: string;
        donutRadiusLabel?: string;
        rotateXAxis?: boolean;
    }): echarts.EChartsOption => {
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
        chartType === 'grouped_bar' || chartType === 'clustered_bar';
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
            grid: { left: 40, right: 20, top: 30, bottom: 80 },
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: rotateXAxis ? { rotate: 30 } : undefined,
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


    const buildOptionForWidget = (widget: CustomWidget): echarts.EChartsOption => {
        const forceRotateXAxis = widget.chartType === 'bar_label_rotation';
        const effectiveChartType: ChartType = widget.chartType === 'column' || forceRotateXAxis ? 'bar' : widget.chartType;

        const metrics = (Array.isArray(widget.metrics) && widget.metrics.length
            ? widget.metrics
            : [widget.metric || 'count']) as MetricKey[];
        const singleMetric = metrics[0] || 'count';
        const hasMultiMetrics = metrics.length > 1;

        const effectiveGroupBy: DimensionKey | 'none' = hasMultiMetrics
            ? 'none'
            : widget.groupBy === 'none' && (effectiveChartType === 'stacked_bar' || effectiveChartType === 'grouped_bar' || effectiveChartType === 'clustered_bar')
                ? ('status' as DimensionKey)
                : widget.groupBy;

        const xLabel = getDimensionLabel(widget.xAxis);
        const yLabel = `${widget.yEntity === 'task' ? 'Task' : widget.yEntity} (${getMetricLabel(singleMetric)})`;

        const filters = widget.filters || {};
        const statusFilter = (filters.status || 'all').toString().trim().toLowerCase();
        const priorityFilter = (filters.priority || 'all').toString().trim().toLowerCase();
        const assigneeFilter = (filters.assignee || 'all').toString().trim().toLowerCase();
        const taskTypeFilter = (filters.taskType || 'all').toString().trim().toLowerCase();
        const companyFilter = (filters.company || 'all').toString().trim().toLowerCase();
        const brandFilter = (filters.brand || 'all').toString().trim().toLowerCase();
        const dateField = (filters.dateField || 'createdAt').toString().trim() as
            | 'createdAt'
            | 'dueDate'
            | 'completedAt'
            | 'updatedAt';
        const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
        const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;

        const getDateValueForFilter = (t: Task): Date | null => {
            const raw =
                dateField === 'completedAt'
                    ? (t as any)?.completedAt || ((t as any)?.status === 'completed' ? (t as any)?.updatedAt : '')
                    : (t as any)?.[dateField];
            const d = new Date(normalizeText(raw));
            return Number.isNaN(d.getTime()) ? null : d;
        };

        const matchesFilters = (t: Task): boolean => {
            if (statusFilter !== 'all') {
                const s = normalizeStatusForFilter(normalizeText((t as any)?.status || ''));
                if (s !== statusFilter) return false;
            }

            if (priorityFilter !== 'all') {
                const p = normalizeStatusForFilter(normalizeText((t as any)?.priority || ''));
                if (p !== priorityFilter) return false;
            }

            if (assigneeFilter !== 'all') {
                const candidate =
                    typeof trendsOptions?.getAssigneeKey === 'function'
                        ? trendsOptions.getAssigneeKey(t)
                        : extractUserLabel((t as any)?.assignedTo, (t as any)?.assignedToName);
                if ((candidate || '').toString().trim().toLowerCase() !== assigneeFilter) return false;
            }

            if (taskTypeFilter !== 'all') {
                const tt = normalizeText((t as any)?.taskType || (t as any)?.type).toLowerCase() || 'unknown';
                if (tt !== taskTypeFilter) return false;
            }

            if (companyFilter !== 'all') {
                const c = normalizeText((t as any)?.companyName || (t as any)?.company).toLowerCase() || 'unknown';
                if (c !== companyFilter) return false;
            }

            if (brandFilter !== 'all') {
                const b = normalizeText((t as any)?.brand).toLowerCase() || 'unknown';
                if (b !== brandFilter) return false;
            }

            if (start || end) {
                const d = getDateValueForFilter(t);
                if (!d) return false;
                if (start && d < start) return false;

                if (end && d > end) return false;
            }
            return true;
        };

        const filteredTasks = (filteredTasksByGlobalDates || []).filter(matchesFilters);

        const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#22c55e', '#f97316'];

        if (hasMultiMetrics) {
            const xCats = Array.from(
                new Set(filteredTasks.map((t) => getDimensionValue(t, widget.xAxis)).filter((x) => (x || '').toString().trim()))
            ).sort((a, b) => a.localeCompare(b));

            const sumsByMetric = new Map<MetricKey, Map<string, number>>();
            metrics.forEach((m) => sumsByMetric.set(m, new Map()));

            filteredTasks.forEach((t) => {
                const x = getDimensionValue(t, widget.xAxis);
                metrics.forEach((m) => {
                    const v = getMetricValue(t, widget.yEntity, m);
                    if (v === null) return;
                    const map = sumsByMetric.get(m)!;
                    map.set(x, (map.get(x) || 0) + v);
                });
            });

            if (effectiveChartType === 'pie' || effectiveChartType === 'donut') {
                const totalsByMetric = metrics.map((m) =>
                    filteredTasks.reduce((sum, t) => sum + (Number(getMetricValue(t, widget.yEntity, m)) || 0), 0)
                );
                return buildBasicCategoryOption({
                    categories: metrics.map((m) => getMetricLabel(m)),
                    values: totalsByMetric,
                    seriesName: 'Tasks',
                    chartType: effectiveChartType,
                    emptyText: 'No data',
                    numberLabel: widget.title,
                });
            }

            const hasData = xCats.length > 0 && metrics.some((m) => filteredTasks.some((t) => getMetricValue(t, widget.yEntity, m) !== null));
            const emptyTitle = getEmptyTitle(hasData, 'No data');
            const isArea = effectiveChartType === 'area';
            const isLine =
                effectiveChartType === 'line' || effectiveChartType === 'burnup' || effectiveChartType === 'burndown' || isArea;
            const seriesType: 'bar' | 'line' = isLine ? 'line' : 'bar';
            const isGroupedOrClustered = effectiveChartType === 'grouped_bar' || effectiveChartType === 'clustered_bar';

            const series = metrics.map((m, idx) => {
                const data = xCats.map((x) => sumsByMetric.get(m)?.get(x) || 0);
                const color = palette[idx % palette.length];
                return {
                    name: getMetricLabel(m),
                    type: seriesType,
                    data,
                    barMaxWidth: seriesType === 'bar' ? (isGroupedOrClustered ? 32 : 50) : undefined,
                    barGap: seriesType === 'bar' && isGroupedOrClustered ? '15%' : undefined,
                    barCategoryGap: seriesType === 'bar' && isGroupedOrClustered ? '45%' : undefined,
                    smooth: seriesType === 'line',
                    symbolSize: 7,
                    itemStyle: { color },
                    lineStyle: { color, width: 3 },
                    areaStyle: isArea ? { opacity: 0.25 } : undefined,
                };
            });

            const axisLabelRotate = forceRotateXAxis ? 30 : xCats.length > 6 ? 30 : 0;

            return {
                title: emptyTitle,
                tooltip: { trigger: 'axis' },
                legend: { top: 'bottom' },
                grid: { left: 50, right: 20, top: 30, bottom: 90 },
                xAxis: {
                    type: 'category',
                    data: xCats,
                    axisLabel: axisLabelRotate ? { rotate: axisLabelRotate } : undefined,
                    name: xLabel,
                    nameLocation: 'middle',
                    nameGap: 40,
                },
                yAxis: {
                    type: 'value',
                    minInterval: 1,
                    name: 'Tasks',
                    nameLocation: 'middle',
                    nameGap: 50,
                },
                series,
            };
        }

        const acc = new Map<string, Map<string, number>>();
        const groupSet = new Set<string>();

        filteredTasks.forEach((t) => {
            const v = getMetricValue(t, widget.yEntity, singleMetric);
            if (v === null) return;
            const x = getDimensionValue(t, widget.xAxis);
            const g = effectiveGroupBy === 'none' ? 'Tasks' : getDimensionValue(t, effectiveGroupBy);
            groupSet.add(g);
            if (!acc.has(x)) acc.set(x, new Map());
            const inner = acc.get(x)!;
            inner.set(g, (inner.get(g) || 0) + v);
        });

        const xCats = Array.from(acc.keys()).sort((a, b) => a.localeCompare(b));
        const groups = Array.from(groupSet.values()).sort((a, b) => a.localeCompare(b));
        const total = xCats.reduce((sum, x) => {
            const row = acc.get(x);
            if (!row) return sum;
            let rowSum = 0;
            for (const v of row.values()) rowSum += Number(v) || 0;
            return sum + rowSum;
        }, 0);

        if (widget.chartType === 'number') {
            return buildBasicCategoryOption({
                categories: ['Tasks'],
                values: [total],
                seriesName: 'Tasks',
                chartType: 'number',
                emptyText: 'No data',
                numberLabel: widget.title,
            });
        }

        if (effectiveChartType === 'pie' || effectiveChartType === 'donut') {
            if (effectiveGroupBy !== 'none') {
                const totalsByGroup = groups.map((g) =>
                    xCats.reduce((sum, x) => sum + (acc.get(x)?.get(g) || 0), 0)
                );
                return buildBasicCategoryOption({
                    categories: groups,
                    values: totalsByGroup,
                    seriesName: 'Tasks',
                    chartType: effectiveChartType,
                    emptyText: 'No data',
                    numberLabel: widget.title,
                });
            }

            const totalsByX = xCats.map((x) => {
                const row = acc.get(x);
                if (!row) return 0;
                return Array.from(row.values()).reduce((s, v) => s + (Number(v) || 0), 0);
            });
            return buildBasicCategoryOption({
                categories: xCats,
                values: totalsByX,
                seriesName: 'Tasks',
                chartType: effectiveChartType,
                emptyText: 'No data',
                numberLabel: widget.title,
                rotateXAxis: forceRotateXAxis || xCats.length > 6,
            });
        }

        const hasData = xCats.length > 0 && total > 0;
        const emptyTitle = getEmptyTitle(hasData, 'No data');
        const isArea = effectiveChartType === 'area';
        const isLine =
            effectiveChartType === 'line' || effectiveChartType === 'burnup' || effectiveChartType === 'burndown' || isArea;
        const seriesType: 'bar' | 'line' = isLine ? 'line' : 'bar';
        const useStack = effectiveChartType === 'stacked_bar';
        const isGroupedOrClustered = effectiveChartType === 'grouped_bar' || effectiveChartType === 'clustered_bar';
        const showPercent =
            Boolean(widget.showPercent) &&
            seriesType === 'bar' &&
            effectiveGroupBy !== 'none' &&
            (effectiveChartType === 'grouped_bar' || effectiveChartType === 'clustered_bar');
        if (effectiveGroupBy === 'none') {
            const totalsByX = xCats.map((x) => {
                const row = acc.get(x);
                if (!row) return 0;
                return Array.from(row.values()).reduce((s, v) => s + (Number(v) || 0), 0);
            });
            return buildBasicCategoryOption({
                categories: xCats,
                values: totalsByX,
                seriesName: 'Tasks',
                chartType: effectiveChartType,
                emptyText: 'No data',
                numberLabel: widget.title,
                rotateXAxis: forceRotateXAxis || xCats.length > 6,
            });
        }

        const totalsByX = showPercent
            ? xCats.map((x) => {
                const row = acc.get(x);
                if (!row) return 0;
                return Array.from(row.values()).reduce((s, v) => s + (Number(v) || 0), 0);
            })
            : [];

        const series = groups.map((g, idx) => {
            const data = xCats.map((x, xIdx) => {
                const raw = acc.get(x)?.get(g) || 0;
                if (!showPercent) return raw;
                const denom = totalsByX[xIdx] || 0;
                if (!denom) return 0;
                return Math.round((raw / denom) * 100);
            });
            const color = palette[idx % palette.length];
            return {
                name: g,
                type: seriesType,
                data,
                stack: seriesType === 'bar' && useStack ? 'total' : undefined,
                barMaxWidth: seriesType === 'bar' ? (isGroupedOrClustered ? 32 : 50) : undefined,
                barGap: seriesType === 'bar' && isGroupedOrClustered ? '15%' : undefined,
                barCategoryGap: seriesType === 'bar' && isGroupedOrClustered ? '45%' : undefined,
                label: showPercent
                    ? {
                        show: true,
                        position: 'top',
                        formatter: '{c}%',
                    }
                    : undefined,
                smooth: seriesType === 'line',
                symbolSize: 7,
                itemStyle: { color },
                lineStyle: { color, width: 3 },
                areaStyle: isArea ? { opacity: 0.25 } : undefined,
            };
        });

        const axisLabelRotate = forceRotateXAxis ? 30 : xCats.length > 6 ? 30 : 0;

        return {
            title: emptyTitle,
            tooltip: showPercent
                ? {
                    trigger: 'axis',
                    formatter: (params: any) => {
                        const items = Array.isArray(params) ? params : [params];
                        const axis = (items?.[0]?.axisValueLabel ?? items?.[0]?.name ?? '').toString();
                        const lines = [axis];
                        items.forEach((it: any) => {
                            const v = Number(it?.value) || 0;
                            lines.push(`${it?.marker || ''}${it?.seriesName || ''}: ${v}%`);
                        });
                        return lines.join('<br/>');
                    },
                }
                : { trigger: 'axis' },
            legend: { top: 'bottom' },
            grid: { left: 50, right: 20, top: 30, bottom: 90 },
            xAxis: {
                type: 'category',
                data: xCats,
                axisLabel: axisLabelRotate ? { rotate: axisLabelRotate } : undefined,
                name: xLabel,
                nameLocation: 'middle',
                nameGap: 40,
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                name: showPercent ? 'Percentage' : yLabel,
                min: showPercent ? 0 : undefined,
                max: showPercent ? 100 : undefined,
                axisLabel: showPercent ? { formatter: '{value}%' } : undefined,
                nameLocation: 'middle',
                nameGap: 50,
            },
            series: series as any,
        };
    };

    useEffect(() => {
        const update = () => {
            let best = 1;
            let reason = '';

            if (gridRef.current) {
                const containerWidth = gridRef.current.offsetWidth;
                const gap = 24; // gap-6 = 1.5rem = 24px
                const idealChartWidth = 420; // ideal width for readability

                // Try 4 columns
                if (containerWidth >= 4 * idealChartWidth + 3 * gap) {
                    best = 4;
                    reason = 'Plenty of space for 4 charts';
                }
                // Try 3 columns
                else if (containerWidth >= 3 * idealChartWidth + 2 * gap) {
                    best = 3;
                    reason = 'Good fit for 3 charts';
                }
                // Try 2 columns
                else if (containerWidth >= 2 * idealChartWidth + gap) {
                    best = 2;
                    reason = 'Comfortable for 2 charts';
                }
                // Fallback to 1
                else {
                    best = 1;
                    reason = 'Narrow screen, 1 chart per row best';
                }
            } else {
                // Fallback to screen-width based recommendation when container not yet mounted
                const w = window.innerWidth;
                if (w < 768) { best = 1; reason = 'Narrow screen, 1 chart per row best'; }
                else if (w < 1024) { best = 2; reason = 'Comfortable for 2 charts'; }
                else if (w < 1280) { best = 3; reason = 'Good fit for 3 charts'; }
                else { best = 4; reason = 'Plenty of space for 4 charts'; }
            }

            setRecommendCols(best);
            setRecommendReason(reason);
            if (!userHasChangedChartsPerRow) {
                setChartsPerRow(best as 1 | 2 | 3 | 4);
            }
        };
        update();
        const ro = new ResizeObserver(update);
        if (gridRef.current) ro.observe(gridRef.current);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [userHasChangedChartsPerRow]);

    const createdByCounts = useMemo(() => {
        const getCreatorLabel = (t: Task): string => {
            const assignedByName = (t as any)?.assignedByName;
            if (assignedByName && assignedByName.toString().trim()) return assignedByName.toString().trim();

            const assignedBy = (t as any)?.assignedBy;
            if (assignedBy && typeof assignedBy === 'object') {
                const name = (assignedBy.name || '').toString().trim();
                if (name) return name;

                const email = (assignedBy.email || '').toString().trim();
                if (email) return email.split('@')[0] || email;

                const id = (assignedBy.id || assignedBy._id || '').toString().trim();
                if (id) return id;
            }

            if (typeof assignedBy === 'string' && assignedBy.trim()) {
                const value = assignedBy.trim();
                return value.includes('@') ? (value.split('@')[0] || value) : value;
            }

            return 'Unknown';
        };

        const counts = new Map<string, number>();
        (filteredTasksByGlobalDates || []).forEach((t) => {
            const label = getCreatorLabel(t);
            counts.set(label, (counts.get(label) || 0) + 1);
        });

        const categories = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
        const data = categories.map((name) => counts.get(name) || 0);
        return { categories, data };
    }, [filteredTasksByGlobalDates]);

    const assignedSummary = useMemo(() => {
        const myEmail = (currentUserEmailProp || '').toString().trim().toLowerCase();
        const extractEmail = (value: unknown): string => {
            if (!value) return '';
            if (typeof value === 'string') return value.toString().trim().toLowerCase();
            if (typeof value === 'object') {
                const email = (value as any)?.email;
                if (email) return email.toString().trim().toLowerCase();
            }
            return '';
        };

        let assignedByMe = 0;
        let assignedToMe = 0;

        if (!myEmail) return { assignedByMe, assignedToMe, myEmail };

        (filteredTasksByGlobalDates || []).forEach((t) => {
            const assignedByEmail = extractEmail((t as any)?.assignedBy);
            const assignedToEmail = extractEmail((t as any)?.assignedTo);

            if (assignedByEmail === myEmail) assignedByMe += 1;
            if (assignedToEmail === myEmail) assignedToMe += 1;
        });

        return { assignedByMe, assignedToMe, myEmail };
    }, [filteredTasksByGlobalDates, currentUserEmailProp]);

    const assignedToByMeCounts = useMemo(() => {
        const myEmail = (currentUserEmailProp || '').toString().trim().toLowerCase();

        const extractEmail = (value: unknown): string => {
            if (!value) return '';
            if (typeof value === 'string') return value.toString().trim().toLowerCase();
            if (typeof value === 'object') {
                const email = (value as any)?.email;
                if (email) return email.toString().trim().toLowerCase();
            }
            return '';
        };

        const getAssigneeLabel = (t: Task): string => {
            const assignedToName = (t as any)?.assignedToName;
            if (assignedToName && assignedToName.toString().trim()) return assignedToName.toString().trim();

            const assignedTo = (t as any)?.assignedTo;
            if (assignedTo && typeof assignedTo === 'object') {
                const name = (assignedTo.name || '').toString().trim();
                if (name) return name;

                const email = (assignedTo.email || '').toString().trim();
                if (email) return email.split('@')[0] || email;

                const id = (assignedTo.id || assignedTo._id || '').toString().trim();
                if (id) return id;
            }

            if (typeof assignedTo === 'string' && assignedTo.trim()) {
                const value = assignedTo.trim();
                return value.includes('@') ? (value.split('@')[0] || value) : value;
            }

            return 'Unknown';
        };

        if (!myEmail) return { categories: [], data: [], myEmail };

        const counts = new Map<string, number>();
        (filteredTasksByGlobalDates || []).forEach((t) => {
            const assignedByEmail = extractEmail((t as any)?.assignedBy);
            if (assignedByEmail !== myEmail) return;

            const label = getAssigneeLabel(t);
            counts.set(label, (counts.get(label) || 0) + 1);
        });

        const categories = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
        const data = categories.map((name) => counts.get(name) || 0);
        return { categories, data, myEmail };
    }, [filteredTasksByGlobalDates, currentUserEmailProp]);

    const trendsOptions = useMemo(() => {
        const normalize = (v: unknown) => (v || '').toString().trim();
        const normalizeKey = (v: unknown) => normalize(v).toLowerCase();

        const getAssigneeKey = (t: Task): string => {
            const assignedTo = (t as any)?.assignedTo;
            if (typeof assignedTo === 'string' && assignedTo.trim()) {
                const cleaned = stripDeletedEmailSuffix(assignedTo.trim());
                return cleaned || assignedTo.trim();
            }
            if (assignedTo && typeof assignedTo === 'object') {
                const email = stripDeletedEmailSuffix(normalize((assignedTo as any)?.email));
                if (email) return email;
                const name = normalize((assignedTo as any)?.name);
                if (name) return name;
                const id = normalize((assignedTo as any)?.id || (assignedTo as any)?._id);
                if (id) return id;
            }
            const assignedToName = normalize((t as any)?.assignedToName);
            if (assignedToName) return assignedToName;
            return 'Unknown';
        };

        const assignees = new Set<string>();
        const companies = new Set<string>();
        const brands = new Set<string>();

        (filteredTasksByGlobalDates || []).forEach((t) => {
            const assignee = getAssigneeKey(t);
            if (assignee && assignee !== 'Unknown') assignees.add(assignee);

            const company = normalize((t as any)?.companyName || (t as any)?.company);
            if (company) companies.add(company);

            const brand = normalize((t as any)?.brand);
            if (brand) brands.add(brand);
        });

        return {
            assignees: ['all', ...Array.from(assignees).sort((a, b) => a.localeCompare(b))],
            companies: ['all', ...Array.from(companies).sort((a, b) => a.localeCompare(b))],
            brands: ['all', ...Array.from(brands).sort((a, b) => a.localeCompare(b))],
            normalizeKey,
            getAssigneeKey,
        };
    }, [filteredTasksByGlobalDates]);

    const completionTrends = useMemo(() => {
        const normalizeKey = trendsOptions.normalizeKey;
        const getAssigneeKey = trendsOptions.getAssigneeKey;

        const start = trendsStartDate ? new Date(`${trendsStartDate}T00:00:00`) : null;
        const end = trendsEndDate ? new Date(`${trendsEndDate}T23:59:59`) : null;

        const bucketKey = (d: Date): string => {
            if (trendsGranularity === 'daily') {
                return d.toISOString().slice(0, 10);
            }
            if (trendsGranularity === 'monthly') {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }

            const day = d.getDay();
            const diff = (day + 6) % 7;
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - diff);
            startOfWeek.setHours(0, 0, 0, 0);
            return startOfWeek.toISOString().slice(0, 10);
        };

        const acc = new Map<string, { completed: number; pending: number }>();

        (filteredTasksByGlobalDates || []).forEach((t) => {
            if (trendsAssignee !== 'all') {
                const assigneeKey = getAssigneeKey(t);
                if (normalizeKey(assigneeKey) !== normalizeKey(trendsAssignee)) return;
            }

            if (trendsCompany !== 'all') {
                const company = (t.companyName || (t as any)?.company || '').toString();
                if (normalizeKey(company) !== normalizeKey(trendsCompany)) return;
            }

            if (trendsBrand !== 'all') {
                const brand = (t.brand || '').toString();
                if (normalizeKey(brand) !== normalizeKey(trendsBrand)) return;
            }

            const base = new Date((t.dueDate || t.createdAt || '').toString());
            if (Number.isNaN(base.getTime())) return;
            if (start && base < start) return;
            if (end && base > end) return;

            const key = bucketKey(base);
            if (!acc.has(key)) acc.set(key, { completed: 0, pending: 0 });
            const entry = acc.get(key)!;

            if (t.status === 'completed') entry.completed += 1;
            else entry.pending += 1;
        });

        const keys = Array.from(acc.keys()).sort();
        return {
            labels: keys,
            completed: keys.map((k) => acc.get(k)!.completed),
            pending: keys.map((k) => acc.get(k)!.pending),
        };
    }, [filteredTasksByGlobalDates, trendsAssignee, trendsBrand, trendsCompany, trendsGranularity, trendsOptions, trendsStartDate, trendsEndDate]);

    const leaderboardData = useMemo(() => {
        const normalizeKey = trendsOptions.normalizeKey;
        const getAssigneeKey = trendsOptions.getAssigneeKey;

        const start = leaderboardStartDate ? new Date(`${leaderboardStartDate}T00:00:00`) : null;
        const end = leaderboardEndDate ? new Date(`${leaderboardEndDate}T23:59:59`) : null;

        const statsByAssignee = new Map<string, { completed: number; total: number }>();

        (filteredTasksByGlobalDates || []).forEach((t) => {
            const company = (t.companyName || (t as any)?.company || '').toString();
            const brand = (t.brand || '').toString();
            if (leaderboardCompany !== 'all' && normalizeKey(company) !== normalizeKey(leaderboardCompany)) return;
            if (leaderboardBrand !== 'all' && normalizeKey(brand) !== normalizeKey(leaderboardBrand)) return;

            const base = new Date(((t as any)?.updatedAt || t.createdAt || t.dueDate || '').toString());
            if (Number.isNaN(base.getTime())) return;
            if (start && base < start) return;
            if (end && base > end) return;

            const assignee = getAssigneeKey(t);
            if (!assignee || assignee === 'Unknown') return;

            const current = statsByAssignee.get(assignee) || { completed: 0, total: 0 };
            current.total += 1;
            if (t.status === 'completed') current.completed += 1;
            statsByAssignee.set(assignee, current);
        });

        const rows = Array.from(statsByAssignee.entries()).map(([name, s]) => {
            const rate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
            return { name, completed: s.completed, rate };
        });

        rows.sort((a, b) => {
            if (leaderboardMetric === 'rate') return b.rate - a.rate;
            return b.completed - a.completed;
        });

        const top = rows.slice(0, Math.max(1, leaderboardTopN || 5));
        return {
            categories: top.map((r) => r.name),
            values: top.map((r) => (leaderboardMetric === 'rate' ? Number(r.rate.toFixed(2)) : r.completed)),
            metricLabel: leaderboardMetric === 'rate' ? 'Completion Rate (%)' : 'Completed Tasks',
        };
    }, [filteredTasksByGlobalDates, trendsOptions, leaderboardMetric, leaderboardStartDate, leaderboardEndDate, leaderboardCompany, leaderboardBrand, leaderboardTopN]);

    const performanceData = useMemo(() => {
        const start = performanceStartDate ? new Date(`${performanceStartDate}T00:00:00`) : null;
        const end = performanceEndDate ? new Date(`${performanceEndDate}T23:59:59`) : null;

        const statusOrder: string[] = ['completed', 'in-progress', 'pending'];
        const statusLabel: Record<string, string> = {
            completed: 'Completed',
            'in-progress': 'In Progress',
            pending: 'Pending',
        };
        const statusColor: Record<string, string> = {
            completed: '#10b981',
            'in-progress': '#3b82f6',
            pending: '#f59e0b',
        };

        const map = new Map<string, Record<string, number>>();

        (filteredTasksByGlobalDates || []).forEach((t) => {
            const base = new Date(((t as any)?.updatedAt || t.createdAt || t.dueDate || '').toString());
            if (Number.isNaN(base.getTime())) return;
            if (start && base < start) return;
            if (end && base > end) return;

            const groupRaw =
                performanceGroupBy === 'brand'
                    ? (t.brand || '').toString().trim()
                    : (t.companyName || (t as any)?.company || '').toString().trim();

            const group = groupRaw || 'Unknown';
            const status = (t.status || 'pending').toString();

            if (!map.has(group)) map.set(group, {});
            const entry = map.get(group)!;
            entry[status] = (entry[status] || 0) + 1;
        });

        const categories = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
        const series = statusOrder.map((s) => ({
            name: statusLabel[s] || s,
            type: 'bar' as const,
            stack: 'total',
            data: categories.map((c) => map.get(c)?.[s] || 0),
            itemStyle: { color: statusColor[s] || '#9ca3af' },
        }));

        return { categories, series };
    }, [filteredTasksByGlobalDates, trendsOptions, performanceGroupBy, performanceStartDate, performanceEndDate]);

    useEffect(() => {
        if (!isAddWidgetOpen) return;
        const dom = addWidgetPreviewRef.current;
        if (!dom) return;

        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        addWidgetPreviewChartRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            addWidgetPreviewChartRef.current = null;
        };
    }, [isAddWidgetOpen]);

    useEffect(() => {
        if (!isAddWidgetOpen) return;
        const chart = addWidgetPreviewChartRef.current;
        if (!chart) return;

        const computedTitle = getAutoWidgetTitle({
            xAxis: newWidgetXAxis,
            groupBy: newWidgetGroupBy,
            metrics: newWidgetMetrics,
        });

        const option = buildOptionForWidget({
            id: '__preview__',
            title: computedTitle,
            chartType: newWidgetChartType,
            xAxis: newWidgetXAxis,
            groupBy: newWidgetGroupBy,
            yEntity: 'task',
            metrics: newWidgetMetrics,
            showPercent: newWidgetShowPercent,
            filters: {
                status: newWidgetFilterStatus,
                priority: newWidgetFilterPriority,
                assignee: newWidgetFilterAssignee,
                taskType: newWidgetFilterTaskType,
                company: newWidgetFilterCompany,
                brand: newWidgetFilterBrand,
                dateField: newWidgetDateField,
                startDate: newWidgetStartDate,
                endDate: newWidgetEndDate,
            },
        });
        chart.setOption(option, true);
        requestAnimationFrame(() => chart.resize());
    }, [
        isAddWidgetOpen,
        newWidgetTitle,
        newWidgetChartType,
        newWidgetXAxis,
        newWidgetGroupBy,
        newWidgetMetrics,
        newWidgetShowPercent,
        newWidgetFilterStatus,
        newWidgetFilterPriority,
        newWidgetFilterAssignee,
        newWidgetFilterTaskType,
        newWidgetFilterCompany,
        newWidgetFilterBrand,
        newWidgetDateField,
        newWidgetStartDate,
        newWidgetEndDate,
        tasks,
        filteredTasksByGlobalDates,
    ]);

    useEffect(() => {
        const existingIds = new Set(customWidgets.map((w) => w.id));

        for (const [id, chart] of customWidgetChartRef.current.entries()) {
            if (!existingIds.has(id)) {
                chart.dispose();
                customWidgetChartRef.current.delete(id);
                customWidgetDomRef.current.delete(id);
            }
        }

        customWidgets.forEach((w) => {
            const dom = customWidgetDomRef.current.get(w.id);
            if (!dom) return;
            const chart = customWidgetChartRef.current.get(w.id) ?? (echarts.getInstanceByDom(dom) ?? echarts.init(dom));
            customWidgetChartRef.current.set(w.id, chart);
            chart.setOption(buildOptionForWidget(w), true);
            chart.off('click');
            chart.on('click', (params: any) => {
                const xValue = (params?.name || '').toString();
                const seriesName = (params?.seriesName || '').toString();

                const activeMetrics = (Array.isArray(w.metrics) && w.metrics.length
                    ? w.metrics
                    : [w.metric || 'count']) as MetricKey[];
                const hasMultiMetrics = activeMetrics.length > 1;

                const effectiveGroupBy =
                    hasMultiMetrics
                        ? ('none' as const)
                        : w.groupBy === 'none' && (w.chartType === 'stacked_bar' || w.chartType === 'grouped_bar' || w.chartType === 'clustered_bar')
                            ? ('status' as DimensionKey)
                            : w.groupBy;

                const fromX = mapDimensionToFilters(w.xAxis, xValue);
                const metricKeyFromSeries = hasMultiMetrics
                    ? activeMetrics.find((m) => getMetricLabel(m) === seriesName)
                    : undefined;
                const fromMetric =
                    metricKeyFromSeries === 'completed' ||
                        metricKeyFromSeries === 'pending' ||
                        metricKeyFromSeries === 'in_progress' ||
                        metricKeyFromSeries === 'on_hold' ||
                        metricKeyFromSeries === 'cancelled'
                        ? mapDimensionToFilters('status', getMetricLabel(metricKeyFromSeries))
                        : metricKeyFromSeries === 'overdue' || metricKeyFromSeries === 'upcoming' || metricKeyFromSeries === 'unscheduled'
                            ? mapDimensionToFilters('completion_status', getMetricLabel(metricKeyFromSeries))
                            : {};
                const fromG =
                    !hasMultiMetrics && effectiveGroupBy !== 'none' && seriesName && seriesName !== 'Tasks'
                        ? mapDimensionToFilters(effectiveGroupBy, seriesName)
                        : {};

                navigateToTasks({
                    q: appendQ(appendQ(fromX.q || '', fromG.q || ''), fromMetric.q || ''),
                    status: fromMetric.status || fromG.status || fromX.status,
                    priority: fromG.priority || fromX.priority,
                    company: fromG.company || fromX.company,
                    brand: fromG.brand || fromX.brand,
                    taskType: fromG.taskType || fromX.taskType,
                    date: fromMetric.date || fromG.date || fromX.date,
                });
            });
            requestAnimationFrame(() => chart.resize());
        });
    }, [customWidgets, filteredTasksByGlobalDates]);

    useEffect(() => {
        const onResize = () => {
            for (const chart of customWidgetChartRef.current.values()) {
                chart.resize();
            }
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;

        const dom = chartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        chartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            chartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!leaderboardChartRef.current) return;

        const dom = leaderboardChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        leaderboardChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            leaderboardChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!performanceChartRef.current) return;

        const dom = performanceChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        performanceChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            performanceChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!overdueByCompanyChartRef.current) return;

        const dom = overdueByCompanyChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        overdueByCompanyChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            overdueByCompanyChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!trendsChartRef.current) return;

        const dom = trendsChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        trendsChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            trendsChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!assignedToChartRef.current) return;

        const dom = assignedToChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        assignedToChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            assignedToChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!assignedChartRef.current) return;

        const dom = assignedChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        assignedChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            assignedChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart) return;

        const hasData = createdByCounts.categories.length > 0;

        const pieData = createdByCounts.categories.map((name, idx) => ({
            name,
            value: createdByCounts.data[idx] ?? 0,
        }));

        const isPie = chartType === 'pie' || chartType === 'donut';
        const isNumber = chartType === 'number';
        const isLollipop = chartType === 'lollipop';
        const isArea = chartType === 'area';
        const isLine = chartType === 'line' || chartType === 'burnup' || chartType === 'burndown' || isArea;
        const seriesType: 'bar' | 'line' = isLine ? 'line' : 'bar';
        const isGroupedOrClustered = chartType === 'grouped_bar' || chartType === 'clustered_bar';

        const emptyTitle = hasData
            ? undefined
            : {
                text: 'No data',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
            };

        const totalValue = createdByCounts.data.reduce((acc, v) => acc + (Number(v) || 0), 0);

        const option: echarts.EChartsOption = isNumber
            ? {
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
                                text: 'Total Tasks',
                                fontSize: 14,
                                fontWeight: 500,
                                fill: '#6b7280',
                            },
                            silent: true,
                            z: 10,
                        },
                    ]
                    : [],
            }
            : isPie
                ? {
                    title: emptyTitle,
                    tooltip: { trigger: 'item' },
                    legend: { top: 'bottom' },
                    series: [
                        {
                            name: 'Tasks Created',
                            type: 'pie',
                            radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
                            avoidLabelOverlap: true,
                            label: { show: true, formatter: '{b}: {c}' },
                            data: pieData,
                        },
                    ],
                }
                : {
                    title: emptyTitle,
                    tooltip: { trigger: 'axis' },
                    grid: { left: 40, right: 20, top: 30, bottom: 80 },
                    xAxis: {
                        type: 'category',
                        data: createdByCounts.categories,
                        axisLabel: { rotate: 30 },
                    },
                    yAxis: {
                        type: 'value',
                        minInterval: 1,
                    },
                    series: isLollipop
                        ? [
                            {
                                name: 'Tasks Created',
                                data: createdByCounts.data,
                                type: 'bar',
                                barWidth: 2,
                                itemStyle: { color: '#3b82f6' },
                            },
                            {
                                name: 'Tasks Created',
                                data: createdByCounts.data,
                                type: 'scatter',
                                symbolSize: 12,
                                itemStyle: { color: '#3b82f6' },
                            },
                        ]
                        : [
                            {
                                name: 'Tasks Created',
                                data: createdByCounts.data,
                                type: seriesType,
                                stack: chartType === 'stacked_bar' ? 'total' : undefined,
                                barMaxWidth: seriesType === 'bar' ? (isGroupedOrClustered ? 32 : 50) : undefined,
                                barGap: seriesType === 'bar' && isGroupedOrClustered ? '15%' : undefined,
                                barCategoryGap: seriesType === 'bar' && isGroupedOrClustered ? '45%' : undefined,
                                smooth: seriesType === 'line',
                                symbolSize: 8,
                                itemStyle: { color: '#3b82f6' },
                                lineStyle: { color: '#3b82f6', width: 3 },
                                areaStyle: isArea ? { opacity: 0.25 } : undefined,
                            },
                        ],
                };

        chart.setOption(option, true);
        chart.off('click');
        chart.on('click', (params: any) => {
            const name = (params?.name || '').toString();
            if (name) {
                navigateToTasks({ q: name });
                return;
            }
            navigateToTasks({});
        });
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [createdByCounts, chartType]);

    useEffect(() => {
        const chart = assignedChartInstanceRef.current;
        if (!chart) return;

        const hasUser = Boolean(assignedSummary.myEmail);

        const labels: string[] = ['Assigned by me', 'Assigned to me'];
        const values: number[] = [assignedSummary.assignedByMe, assignedSummary.assignedToMe];
        const hasData = values.some((v) => v > 0);

        const emptyTitle = hasUser
            ? hasData
                ? undefined
                : {
                    text: 'No data',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                }
            : {
                text: 'Login required',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
            };

        const colors = ['#3b82f6', '#10b981'];

        const isPie = assignedChartType === 'pie' || assignedChartType === 'donut';
        const isNumber = assignedChartType === 'number';
        const isLollipop = assignedChartType === 'lollipop';
        const isArea = assignedChartType === 'area';
        const isLine = assignedChartType === 'line' || assignedChartType === 'burnup' || assignedChartType === 'burndown' || isArea;
        const seriesType: 'bar' | 'line' = isLine ? 'line' : 'bar';
        const isGroupedOrClustered = assignedChartType === 'grouped_bar' || assignedChartType === 'clustered_bar';
        const totalAssignments = values.reduce((acc, v) => acc + (Number(v) || 0), 0);

        const option: echarts.EChartsOption = isNumber
            ? {
                title: emptyTitle,
                tooltip: { show: false },
                grid: { left: 0, right: 0, top: 0, bottom: 0 },
                xAxis: { show: false },
                yAxis: { show: false },
                series: [],
                graphic: hasUser && hasData
                    ? [
                        {
                            type: 'text',
                            left: 'center',
                            top: '46%',
                            style: {
                                text: `${totalAssignments}`,
                                fontSize: 52,
                                fontWeight: 700,
                                fill: '#111827',
                            },
                        },
                        {
                            type: 'text',
                            left: 'center',
                            top: '56%',
                            style: {
                                text: 'Total Assignments',
                                fontSize: 14,
                                fontWeight: 500,
                                fill: '#6b7280',
                            },
                            silent: true,
                            z: 10,
                        },
                    ]
                    : [],
            }
            : isPie
                ? {
                    title: emptyTitle,
                    tooltip: { trigger: 'item' },
                    legend: { top: 'bottom' },
                    series: [
                        {
                            name: 'Assignments',
                            type: 'pie',
                            radius: assignedChartType === 'donut' ? ['40%', '70%'] : '70%',
                            label: { show: true, formatter: '{b}: {c}' },
                            data: [
                                { name: labels[0], value: values[0], itemStyle: { color: colors[0] } },
                                { name: labels[1], value: values[1], itemStyle: { color: colors[1] } },
                            ],
                        },
                    ],
                }
                : {
                    title: emptyTitle,
                    tooltip: { trigger: 'axis' },
                    grid: { left: 40, right: 20, top: 30, bottom: 60 },
                    xAxis: { type: 'category', data: labels },
                    yAxis: { type: 'value', minInterval: 1 },
                    series: isLollipop
                        ? [
                            {
                                name: 'Assignments',
                                type: 'bar',
                                data: values,
                                barWidth: 2,
                                itemStyle: {
                                    color: (params: any) => colors[params?.dataIndex] || colors[0],
                                },
                            },
                            {
                                name: 'Assignments',
                                type: 'scatter',
                                data: values,
                                symbolSize: 14,
                                itemStyle: {
                                    color: (params: any) => colors[params?.dataIndex] || colors[0],
                                },
                                label: { show: true, position: 'top' },
                            },
                        ]
                        : [
                            {
                                name: 'Assignments',
                                type: seriesType,
                                data: values,
                                stack: assignedChartType === 'stacked_bar' ? 'total' : undefined,
                                barMaxWidth: seriesType === 'bar' ? (isGroupedOrClustered ? 32 : 50) : undefined,
                                barGap: seriesType === 'bar' && isGroupedOrClustered ? '15%' : undefined,
                                barCategoryGap: seriesType === 'bar' && isGroupedOrClustered ? '45%' : undefined,
                                smooth: seriesType === 'line',
                                symbolSize: 10,
                                itemStyle: {
                                    color: (params: any) => colors[params?.dataIndex] || colors[0],
                                },
                                lineStyle: { color: colors[0], width: 3 },
                                areaStyle: isArea ? { opacity: 0.25 } : undefined,
                                label: { show: true, position: 'top' },
                            },
                        ],
                };

        chart.setOption(option, true);
        chart.off('click');
        chart.on('click', (params: any) => {
            const name = (params?.name || '').toString();
            if (!name) return;
            if (name.toLowerCase().includes('assigned by')) {
                navigateToTasks({ assigned: 'assigned-by-me' } as any);
                return;
            }
            if (name.toLowerCase().includes('assigned to')) {
                navigateToTasks({ assigned: 'assigned-to-me' } as any);
            }
        });
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [assignedSummary, assignedChartType]);

    useEffect(() => {
        const chart = overdueByCompanyChartInstanceRef.current;
        if (!chart || hiddenBuiltinSet.has('overdue_by_company')) return;

        const hasData = overdueByCompany.length > 0;
        const emptyTitle = hasData ? undefined : {
            text: 'No Overdue Tasks Found',
            left: 'center',
            top: 'middle',
            textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 }
        };

        const option: echarts.EChartsOption = {
            title: emptyTitle,
            tooltip: { trigger: 'axis' },
            grid: { left: 40, right: 20, top: 30, bottom: 80 },
            xAxis: {
                type: 'category',
                data: overdueByCompany.map(x => x.name),
                axisLabel: { rotate: 30 },
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
            },
            series: [
                {
                    name: 'Overdue Tasks',
                    data: overdueByCompany.map(x => x.count),
                    type: 'bar',
                    itemStyle: { color: '#ef4444' },
                    label: { show: true, position: 'top' }
                }
            ]
        };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [overdueByCompany, hiddenBuiltinSet]);

    useEffect(() => {
        const chart = assignedToChartInstanceRef.current;
        if (!chart) return;

        const hasUser = Boolean(assignedToByMeCounts.myEmail);
        const hasData = assignedToByMeCounts.categories.length > 0;

        const pieData = assignedToByMeCounts.categories.map((name, idx) => ({
            name,
            value: assignedToByMeCounts.data[idx] ?? 0,
        }));

        const isPie = assignedToChartType === 'pie' || assignedToChartType === 'donut';
        const isNumber = assignedToChartType === 'number';
        const isLollipop = assignedToChartType === 'lollipop';
        const isArea = assignedToChartType === 'area';
        const isLine =
            assignedToChartType === 'line' || assignedToChartType === 'burnup' || assignedToChartType === 'burndown' || isArea;
        const seriesType: 'bar' | 'line' = isLine ? 'line' : 'bar';
        const isGroupedOrClustered = assignedToChartType === 'grouped_bar' || assignedToChartType === 'clustered_bar';

        const emptyTitle = hasUser
            ? hasData
                ? undefined
                : {
                    text: 'No data',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                }
            : {
                text: 'Login required',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
            };

        const totalAssigned = assignedToByMeCounts.data.reduce((acc, v) => acc + (Number(v) || 0), 0);

        const option: echarts.EChartsOption = isNumber
            ? {
                title: emptyTitle,
                tooltip: { show: false },
                grid: { left: 0, right: 0, top: 0, bottom: 0 },
                xAxis: { show: false },
                yAxis: { show: false },
                series: [],
                graphic: hasUser && hasData
                    ? [
                        {
                            type: 'text',
                            left: 'center',
                            top: '46%',
                            style: {
                                text: `${totalAssigned}`,
                                fontSize: 52,
                                fontWeight: 700,
                                fill: '#111827',
                            },
                        },
                        {
                            type: 'text',
                            left: 'center',
                            top: '56%',
                            style: {
                                text: 'Tasks assigned by you',
                                fontSize: 14,
                                fontWeight: 500,
                                fill: '#6b7280',
                            },
                            silent: true,
                            z: 10,
                        },
                    ]
                    : [],
            }
            : isPie
                ? {
                    title: emptyTitle,
                    tooltip: { trigger: 'item' },
                    legend: { top: 'bottom' },
                    series: [
                        {
                            name: 'Assigned To',
                            type: 'pie',
                            radius: assignedToChartType === 'donut' ? ['40%', '70%'] : '70%',
                            avoidLabelOverlap: true,
                            label: { show: true, formatter: '{b}: {c}' },
                            data: pieData,
                        },
                    ],
                }
                : {
                    title: emptyTitle,
                    tooltip: { trigger: 'axis' },
                    grid: { left: 40, right: 20, top: 30, bottom: 80 },
                    xAxis: {
                        type: 'category',
                        data: assignedToByMeCounts.categories,
                        axisLabel: { rotate: 30 },
                    },
                    yAxis: { type: 'value', minInterval: 1 },
                    series: isLollipop
                        ? [
                            {
                                name: 'Tasks Assigned',
                                data: assignedToByMeCounts.data,
                                type: 'bar',
                                barWidth: 2,
                                itemStyle: { color: '#8b5cf6' },
                            },
                            {
                                name: 'Tasks Assigned',
                                data: assignedToByMeCounts.data,
                                type: 'scatter',
                                symbolSize: 12,
                                itemStyle: { color: '#8b5cf6' },
                            },
                        ]
                        : [
                            {
                                name: 'Tasks Assigned',
                                data: assignedToByMeCounts.data,
                                type: seriesType,
                                stack: assignedToChartType === 'stacked_bar' ? 'total' : undefined,
                                barMaxWidth: seriesType === 'bar' ? (isGroupedOrClustered ? 32 : 50) : undefined,
                                barGap: seriesType === 'bar' && isGroupedOrClustered ? '15%' : undefined,
                                barCategoryGap: seriesType === 'bar' && isGroupedOrClustered ? '45%' : undefined,
                                smooth: seriesType === 'line',
                                symbolSize: 8,
                                itemStyle: { color: '#8b5cf6' },
                                lineStyle: { color: '#8b5cf6', width: 3 },
                                areaStyle: isArea ? { opacity: 0.25 } : undefined,
                            },
                        ],
                };

        chart.setOption(option, true);
        chart.off('click');
        chart.on('click', (params: any) => {
            const name = (params?.name || '').toString();
            if (!name) return;
            navigateToTasks({ q: name, assigned: 'assigned-by-me' } as any);
        });
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [assignedToByMeCounts, assignedToChartType]);

    useEffect(() => {
        const chart = trendsChartInstanceRef.current;
        if (!chart) return;

        const hasData = completionTrends.labels.length > 0;
        const option: echarts.EChartsOption = {
            title: hasData
                ? undefined
                : {
                    text: 'No data',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                },
            tooltip: { trigger: 'axis' },
            legend: { top: 'bottom' },
            grid: { left: 40, right: 20, top: 30, bottom: 80 },
            xAxis: {
                type: 'category',
                data: completionTrends.labels,
                axisLabel: { rotate: 30 },
            },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
                {
                    name: 'Completed',
                    type: 'line',
                    data: completionTrends.completed,
                    smooth: true,
                    symbolSize: 7,
                    itemStyle: { color: '#10b981' },
                    lineStyle: { color: '#10b981', width: 3 },
                },
                {
                    name: 'Pending',
                    type: 'line',
                    data: completionTrends.pending,
                    smooth: true,
                    symbolSize: 7,
                    itemStyle: { color: '#f59e0b' },
                    lineStyle: { color: '#f59e0b', width: 3 },
                },
            ],
        };

        chart.setOption(option, true);
        chart.off('click');
        chart.on('click', (params: any) => {
            const seriesName = (params?.seriesName || '').toString().toLowerCase();
            if (seriesName === 'completed') {
                navigateToTasks({ status: 'completed' });
                return;
            }
            if (seriesName === 'pending') {
                navigateToTasks({ status: 'pending' });
            }
        });
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [completionTrends]);

    useEffect(() => {
        const chart = leaderboardChartInstanceRef.current;
        if (!chart) return;

        const hasData = leaderboardData.categories.length > 0;
        const option: echarts.EChartsOption = {
            title: hasData
                ? undefined
                : {
                    text: 'No data',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 20, top: 30, bottom: 90 },
            xAxis: { type: 'category', data: leaderboardData.categories, axisLabel: { rotate: 30 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
                {
                    name: leaderboardData.metricLabel,
                    type: 'bar',
                    data: leaderboardData.values,
                    barMaxWidth: 50,
                    itemStyle: { color: '#06b6d4' },
                    label: { show: true, position: 'top' },
                },
            ],
        };

        chart.setOption(option, true);
        chart.off('click');
        chart.on('click', (params: any) => {
            const name = (params?.name || '').toString();
            const q = name;
            const status = leaderboardMetric === 'completed' ? 'completed' : undefined;
            navigateToTasks({ q, status });
        });
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [leaderboardData, leaderboardMetric]);

    useEffect(() => {
        const chart = performanceChartInstanceRef.current;
        if (!chart) return;

        const hasData = performanceData.categories.length > 0;
        const option: echarts.EChartsOption = {
            title: hasData
                ? undefined
                : {
                    text: 'No data',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: 'bottom' },
            grid: { left: 50, right: 20, top: 30, bottom: 90 },
            xAxis: { type: 'category', data: performanceData.categories, axisLabel: { rotate: 30 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: performanceData.series,
        };

        chart.setOption(option, true);
        chart.off('click');
        chart.on('click', (params: any) => {
            const group = (params?.name || '').toString();
            const seriesName = (params?.seriesName || '').toString();
            if (!group) return;

            const statusLabel = normalizeStatusForFilter(seriesName);
            const status = statusLabel ? statusLabel : undefined;

            if (performanceGroupBy === 'brand') {
                navigateToTasks({ brand: group, status } as any);
                return;
            }
            navigateToTasks({ company: group, status } as any);
        });
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [performanceData]);

    useEffect(() => {
        requestAnimationFrame(() => {
            chartInstanceRef.current?.resize();
            assignedChartInstanceRef.current?.resize();
            assignedToChartInstanceRef.current?.resize();
            trendsChartInstanceRef.current?.resize();
            leaderboardChartInstanceRef.current?.resize();
            performanceChartInstanceRef.current?.resize();
            for (const chart of customWidgetChartRef.current.values()) {
                chart.resize();
            }
        });
    }, [chartsPerRow]);

    const handleAddMetric = () => {
        // Display Label માંથી internal name બનાવો
        const metricName = newMetricLabel
            .toLowerCase()
            .replace(/[^\w\s]/gi, '') // special characters હટાવો
            .replace(/\s+/g, '_'); // spaces ને underscores માં બદલો

        // Validate
        if (!newMetricLabel.trim()) {
            alert('Please enter a metric label');
            return;
        }

        // Check if metric already exists
        const exists = additionalMetrics.some(
            (m) => m.value === metricName || m.label.toLowerCase() === newMetricLabel.toLowerCase().trim()
        );

        if (exists) {
            alert('A metric with this name already exists');
            return;
        }

        // Add new metric to additionalMetrics
        const newMetric = {
            value: metricName, // internal name
            label: newMetricLabel.trim(), // display label
        };

        setAdditionalMetrics(prev => [...prev, newMetric]);

        // Also add to newWidgetMetrics if not already there
        if (!newWidgetMetrics.includes(metricName as MetricKey)) {
            setNewWidgetMetrics(prev => [...prev, metricName as MetricKey]);
        }

        // Reset and close modal
        setNewMetricLabel('');
        setShowAddMetricModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analyze</h1>
                    <p className="text-gray-600">Task analytics overview</p>
                </div>

                <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 scrollbar-none">
                    <div className="text-sm font-medium text-gray-500 whitespace-nowrap">Charts per row:</div>
                    <div className="flex bg-gray-100 p-1 rounded-xl items-center flex-nowrap">
                        {[1, 2, 3, 4].map((n) => (
                            <button
                                key={n}
                                onClick={() => {
                                    setChartsPerRow(n as any);
                                    setUserHasChangedChartsPerRow(true);
                                }}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${chartsPerRow === n
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    {!userHasChangedChartsPerRow && (
                        <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full" title={recommendReason}>
                            Rec: {recommendCols}
                        </span>
                    )}

                    {isAdminUser && (
                        <button
                            type="button"
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
                            onClick={() => {
                                setNewWidgetTitle('');
                                setNewWidgetChartType('bar');
                                setNewWidgetXAxis('task_type');
                                setNewWidgetGroupBy('status');
                                setNewWidgetMetrics(['count']);
                                setNewWidgetFilterStatus('all');
                                setNewWidgetFilterPriority('all');
                                setNewWidgetFilterAssignee('all');
                                setNewWidgetFilterTaskType('all');
                                setNewWidgetFilterCompany('all');
                                setNewWidgetFilterBrand('all');
                                setNewWidgetDateField('createdAt');
                                setNewWidgetStartDate('');
                                setNewWidgetEndDate('');
                                setIsAddWidgetOpen(true);
                            }}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Add Chart
                        </button>
                    )}
                </div>
            </div>

            {/* Global Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1 min-w-[200px]">
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Building2 className="h-3 w-3" />
                        Company
                    </div>
                    <select
                        value={globalCompany}
                        onChange={(e) => setGlobalCompany(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">All Companies</option>
                        {companies.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1 min-w-[150px]">
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Calendar className="h-3 w-3" />
                        Time Period
                    </div>
                    <select
                        value={globalTimePeriod}
                        onChange={(e) => setGlobalTimePeriod(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">All Time</option>
                        <option value="daily">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                {globalTimePeriod === 'monthly' && (
                    <div className="flex flex-col gap-1 min-w-[150px]">
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <CalendarClock className="h-3 w-3" />
                            Select Month
                        </div>
                        <input
                            type="month"
                            value={globalMonth}
                            onChange={(e) => setGlobalMonth(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                )}

                <div className="flex flex-col gap-1 min-w-[150px]">
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Filter className="h-3 w-3" />
                        Date Field
                    </div>
                    <select
                        value={globalDateField}
                        onChange={(e) => setGlobalDateField(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="createdAt">Created Date</option>
                        <option value="dueDate">Due Date</option>
                        <option value="completedAt">Completed Date</option>
                        <option value="updatedAt">Updated Date</option>
                    </select>
                </div>

                {globalTimePeriod === 'custom' && (
                    <>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Date</label>
                            <input
                                type="date"
                                value={globalStartDate}
                                onChange={(e) => setGlobalStartDate(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</label>
                            <input
                                type="date"
                                value={globalEndDate}
                                onChange={(e) => setGlobalEndDate(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </>
                )}

                <div className="flex-grow" />

                <button
                    onClick={() => {
                        setGlobalCompany('all');
                        setGlobalTimePeriod('all');
                        setGlobalStartDate('');
                        setGlobalEndDate('');
                        setGlobalDateField('createdAt');
                        setGlobalMonth(new Date().toISOString().substring(0, 7));
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    Clear All
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 className="h-12 w-12 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 mb-1">Total Tasks</span>
                    <span className="text-2xl font-bold text-gray-900">{globalSummary.total}</span>
                    <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-emerald-600 mb-1">Completed</span>
                    <span className="text-2xl font-bold text-gray-900">{globalSummary.completed}</span>
                    <div className="mt-4 h-1.5 w-full bg-emerald-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${globalSummary.rate}%` }} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="h-12 w-12 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-amber-600 mb-1">Pending</span>
                    <span className="text-2xl font-bold text-gray-900">{globalSummary.pending}</span>
                    <div className="mt-4 h-1.5 w-full bg-amber-50 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${globalSummary.total > 0 ? (globalSummary.pending / globalSummary.total) * 100 : 0}%` }} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertCircle className="h-12 w-12 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-red-600 mb-1">Overdue</span>
                    <span className="text-2xl font-bold text-gray-900">{globalSummary.overdue}</span>
                    <div className="mt-4 h-1.5 w-full bg-red-50 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${globalSummary.total > 0 ? (globalSummary.overdue / globalSummary.total) * 100 : 0}%` }} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col bg-emerald-50/20">
                    <span className="text-sm font-medium text-emerald-700 mb-1">Completion Rate</span>
                    <span className="text-3xl font-bold text-emerald-700">{globalSummary.rate}%</span>
                    <div className="mt-4 h-2 w-full bg-white rounded-full overflow-hidden border border-emerald-100">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${globalSummary.rate}%` }} />
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-2 font-medium uppercase tracking-tighter">Overall Efficiency</p>
                </div>
            </div>
            
            {/* Smart Analysis Summary */}
            {smartInsights && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">Overall Analysis Summary</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-600 leading-relaxed text-sm">
                                {globalCompany === 'all' ? 'Across all companies' : `For ${globalCompany}`}, 
                                the overall team health is <span className={`font-bold ${smartInsights.health === 'Good' ? 'text-emerald-600' : smartInsights.health === 'Critical' ? 'text-red-600' : 'text-amber-600'}`}>
                                {smartInsights.health}</span>. 
                                {globalSummary.total > 0 && (
                                    <>
                                        {' '}With a completion rate of <span className="font-bold text-gray-900">{globalSummary.rate}%</span>, 
                                        the primary bottleneck is currently tasks in <span className="font-bold text-gray-900 capitalize">"{smartInsights.bottleneckStatus || 'N/A'}"</span> status. 
                                        Most task activities are related to <span className="font-bold text-gray-900">"{smartInsights.bottleneckType || 'N/A'}"</span>.
                                        The majority of tasks are categorized as <span className="font-bold text-gray-900 capitalize">"{smartInsights.topPriority || 'N/A'}"</span> priority.
                                    </>
                                )}
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {smartInsights.topPerformer && (
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 inline-flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span className="text-xs text-emerald-800">
                                            <span className="font-bold">{smartInsights.topPerformer}</span> is the top performer ({smartInsights.performerCount} completions)
                                        </span>
                                    </div>
                                )}
                                {globalSummary.overdue > 0 && (
                                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 inline-flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-red-800 font-medium">
                                                <span className="font-bold">{globalSummary.overdue}</span> critical tasks are overdue
                                            </span>
                                            {smartInsights.overdueHighPriority > 0 && (
                                                <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">
                                                    Includes {smartInsights.overdueHighPriority} High/Urgent tasks
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-64 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
                        <div className="text-center mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Progress</span>
                        </div>
                        <div className="relative h-32 w-32 mx-auto flex items-center justify-center">
                            <svg className="h-40 w-40 transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="transparent"
                                    stroke="#f3f4f6"
                                    strokeWidth="12"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="transparent"
                                    stroke={smartInsights.health === 'Good' ? '#10b981' : smartInsights.health === 'Critical' ? '#ef4444' : '#f59e0b'}
                                    strokeWidth="12"
                                    strokeDasharray={439.8}
                                    strokeDashoffset={439.8 - (439.8 * globalSummary.rate) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-bold text-gray-900">{globalSummary.rate}%</span>
                                <span className="text-[10px] text-gray-400 font-medium">DONE</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed User Performance Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Detailed User Performance Report</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {globalMonth} • {reportFilterCompany === 'all' ? (globalCompany === 'all' ? 'All Companies' : globalCompany) : reportFilterCompany}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <select
                                value={reportFilterCompany}
                                onChange={(e) => setReportFilterCompany(e.target.value)}
                                className="pl-9 pr-8 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">Company: All</option>
                                {companies.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                        <button 
                            onClick={handleExportReport}
                            disabled={userReportData.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all active:scale-95"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Total</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-emerald-600">Completed</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-amber-600">Pending</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-red-600">Overdue</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-purple-600">Ovre due complete</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Success Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {userReportData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                                        No user data found for this selection
                                    </td>
                                </tr>
                            ) : (
                                userReportData.map((row) => (
                                    <tr key={row.name} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                                    {row.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-700">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                                                {row.total}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                                {row.completed}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                                                {row.pending}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 font-mono">
                                                {row.overdue}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 font-mono">
                                                {row.overdueCompleted}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap min-w-[160px] text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="flex-grow bg-gray-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            row.rate > 75 ? 'bg-emerald-500' : row.rate > 40 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${row.rate}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold ${
                                                    row.rate > 75 ? 'text-emerald-700' : row.rate > 40 ? 'text-amber-700' : 'text-red-700'
                                                }`}>
                                                    {row.rate}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAdminUser && (hiddenBuiltinCharts.length > 0 || hiddenCustomWidgetIds.length > 0) && (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Hidden charts</div>
                    <div className="flex flex-wrap gap-2">
                        {BUILTIN_CHARTS.filter((c) => hiddenBuiltinSet.has(c.key)).map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                onClick={() => toggleBuiltinChart(c.key)}
                            >
                                Show {c.label}
                            </button>
                        ))}
                        {customWidgets
                            .filter((w) => hiddenCustomWidgetSet.has(w.id))
                            .map((w) => (
                                <button
                                    key={w.id}
                                    type="button"
                                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                    onClick={() => toggleCustomWidgetHidden(w.id)}
                                >
                                    Show{' '}
                                    {w.title ||
                                        getAutoWidgetTitle({
                                            xAxis: w.xAxis,
                                            groupBy: w.groupBy,
                                            metrics: (w.metrics && w.metrics.length ? w.metrics : [w.metric || 'count']) as MetricKey[],
                                        })}
                                </button>
                            ))}
                    </div>
                </div>
            )}

            <div
                ref={gridRef}
                className={`grid grid-cols-1 ${chartsPerRow === 2 ? 'lg:grid-cols-2' : chartsPerRow === 3 ? 'lg:grid-cols-3' : chartsPerRow === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-6`}
            >
                {!hiddenBuiltinSet.has('overdue_by_company') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Overdue Tasks by User</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {isAdminUser && (
                                    <select
                                        value={overdueChartCompany}
                                        onChange={(e) => setOverdueChartCompany(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white"
                                    >
                                        <option value="all">All Companies</option>
                                        {companies.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    type="button"
                                    className={`p-2 rounded-lg transition-colors ${
                                        isAdminUser
                                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                            : 'text-gray-300 cursor-not-allowed'
                                    }`}
                                    aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                    disabled={!isAdminUser}
                                    onClick={() => toggleBuiltinChart('overdue_by_company')}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div ref={overdueByCompanyChartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}
                {!hiddenBuiltinSet.has('assign_by') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Assign By </h2>
                            <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500">
                                Chart
                                <select
                                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                                    value={chartType}
                                    onChange={(e) => setChartType(e.target.value as ChartType)}
                                >
                                    {CHART_TYPE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="text-sm text-gray-500">Total: {(tasks || []).length}</div>
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => toggleBuiltinChart('assign_by')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                        <div ref={chartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}

                {!hiddenBuiltinSet.has('assigned') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Assigned</h2>
                            <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500">
                                Chart
                                <select
                                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                                    value={assignedChartType}
                                    onChange={(e) => setAssignedChartType(e.target.value as ChartType)}
                                >
                                    {CHART_TYPE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="text-sm text-gray-500">Assigned by/to you</div>
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => toggleBuiltinChart('assigned')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                        <div ref={assignedChartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}

                {!hiddenBuiltinSet.has('assigned_to') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Assigned To </h2>
                            <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500">
                                Chart
                                <select
                                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                                    value={assignedToChartType}
                                    onChange={(e) => setAssignedToChartType(e.target.value as ChartType)}
                                >
                                    {CHART_TYPE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => toggleBuiltinChart('assigned_to')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                        <div ref={assignedToChartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}

                {!hiddenBuiltinSet.has('completion_trends') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4 gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">Completion trends</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsGranularity}
                                onChange={(e) => setTrendsGranularity(e.target.value as any)}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsAssignee}
                                onChange={(e) => setTrendsAssignee(e.target.value)}
                            >
                                {(trendsOptions.assignees || []).map((a) => (
                                    <option key={a} value={a}>
                                        {a === 'all' ? 'All assignees' : a}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsCompany}
                                onChange={(e) => setTrendsCompany(e.target.value)}
                            >
                                {(trendsOptions.companies || []).map((c) => (
                                    <option key={c} value={c}>
                                        {c === 'all' ? 'All companies' : c}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsBrand}
                                onChange={(e) => setTrendsBrand(e.target.value)}
                            >
                                {(trendsOptions.brands || []).map((b) => (
                                    <option key={b} value={b}>
                                        {b === 'all' ? 'All brands' : b}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsStartDate}
                                onChange={(e) => setTrendsStartDate(e.target.value)}
                            />
                            <input
                                type="date"
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsEndDate}
                                onChange={(e) => setTrendsEndDate(e.target.value)}
                            />
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => toggleBuiltinChart('completion_trends')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                        <div ref={trendsChartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}

                {!hiddenBuiltinSet.has('manager_analysis') && (
                    <ManagerAnalysisChart
                        tasks={filteredTasksByGlobalDates}
                        canDelete={isAdminUser}
                        onDelete={() => toggleBuiltinChart('manager_analysis')}
                    />
                )}

                {!hiddenBuiltinSet.has('leaderboard') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4 gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardMetric}
                                onChange={(e) => setLeaderboardMetric(e.target.value as any)}
                            >
                                <option value="completed">Completed</option>
                                <option value="rate">Completion rate</option>
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardCompany}
                                onChange={(e) => setLeaderboardCompany(e.target.value)}
                            >
                                {(trendsOptions.companies || []).map((c) => (
                                    <option key={c} value={c}>
                                        {c === 'all' ? 'All companies' : c}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardBrand}
                                onChange={(e) => setLeaderboardBrand(e.target.value)}
                            >
                                {(trendsOptions.brands || []).map((b) => (
                                    <option key={b} value={b}>
                                        {b === 'all' ? 'All brands' : b}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardStartDate}
                                onChange={(e) => setLeaderboardStartDate(e.target.value)}
                            />
                            <input
                                type="date"
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardEndDate}
                                onChange={(e) => setLeaderboardEndDate(e.target.value)}
                            />
                            <input
                                type="number"
                                min={1}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm w-[80px]"
                                value={leaderboardTopN}
                                onChange={(e) => setLeaderboardTopN(Number(e.target.value) || 5)}
                            />
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => toggleBuiltinChart('leaderboard')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                        <div ref={leaderboardChartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}

                {!hiddenBuiltinSet.has('status_breakdown') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4 gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">Status breakdown</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={performanceGroupBy}
                                onChange={(e) => setPerformanceGroupBy(e.target.value as any)}
                            >
                                <option value="company">Group by Company</option>
                                <option value="brand">Group by Brand</option>
                            </select>
                            <input
                                type="date"
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={performanceStartDate}
                                onChange={(e) => setPerformanceStartDate(e.target.value)}
                            />
                            <input
                                type="date"
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={performanceEndDate}
                                onChange={(e) => setPerformanceEndDate(e.target.value)}
                            />
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => toggleBuiltinChart('status_breakdown')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                        <div ref={performanceChartRef} className="w-full" style={{ height: 360 }} />
                    </div>
                )}

                {customWidgets.filter((w) => !hiddenCustomWidgetSet.has(w.id)).map((w) => (
                    <div key={w.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4 gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {w.title ||
                                    getAutoWidgetTitle({
                                        xAxis: w.xAxis,
                                        groupBy: w.groupBy,
                                        metrics: (w.metrics && w.metrics.length ? w.metrics : [w.metric || 'count']) as MetricKey[],
                                    })}
                            </h2>
                            <button
                                type="button"
                                className={`p-2 rounded-lg transition-colors ${
                                    isAdminUser
                                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={isAdminUser ? 'Hide chart' : 'Only admins can hide charts'}
                                disabled={!isAdminUser}
                                onClick={() => {
                                    if (!isAdminUser) return;
                                    toggleCustomWidgetHidden(w.id);
                                }}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                        <div
                            ref={(el) => {
                                if (el) customWidgetDomRef.current.set(w.id, el);
                                else customWidgetDomRef.current.delete(w.id);
                            }}
                            className="w-full"
                            style={{ height: 360 }}
                        />
                    </div>
                ))}
            </div>

            {isAdminUser && isAddWidgetOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setIsAddWidgetOpen(false);
                    }}
                >
                    <div className="bg-white w-full max-w-6xl h-[80vh] rounded-2xl shadow-lg overflow-hidden flex">
                        <div className="flex-1 p-6 border-r border-gray-200 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Add chart</h2>
                                <button
                                    type="button"
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => setIsAddWidgetOpen(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div ref={addWidgetPreviewRef} className="w-full flex-1" />
                        </div>
                        <div className="w-80 p-6 flex flex-col">
                            <div className="flex-1 overflow-auto space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-1">Chart title</div>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                        placeholder="e.g., Tasks by Status"
                                        value={newWidgetTitle}
                                        onChange={(e) => setNewWidgetTitle(e.target.value)}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Leave empty to use an auto-generated title.
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-1">Chart type</div>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                        value={newWidgetChartType}
                                        onChange={(e) => {
                                            const nextType = e.target.value as ChartType;
                                            setNewWidgetChartType(nextType);
                                            const nextXAxis =
                                                nextType === 'clustered_bar' ? ('created_year_range' as DimensionKey) : newWidgetXAxis;

                                            if (nextType === 'clustered_bar') {
                                                setNewWidgetShowPercent(true);
                                                setNewWidgetXAxis(nextXAxis);
                                            } else if (nextType !== 'grouped_bar') {
                                                setNewWidgetShowPercent(false);
                                            }

                                            if (
                                                (nextType === 'stacked_bar' || nextType === 'grouped_bar' || nextType === 'clustered_bar') &&
                                                newWidgetGroupBy === 'none'
                                            ) {
                                                setNewWidgetGroupBy(nextXAxis === 'status' ? 'priority' : 'status');
                                            }
                                        }}
                                    >
                                        {ADD_WIDGET_CHART_TYPE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-1">X-axis</div>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                        value={newWidgetXAxis}
                                        onChange={(e) => {
                                            const v = e.target.value as DimensionKey;
                                            setNewWidgetXAxis(v);
                                            if (newWidgetGroupBy !== 'none' && newWidgetGroupBy === v) {
                                                setNewWidgetGroupBy('none');
                                            }
                                        }}
                                    >
                                        {DIMENSION_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-1">Group by</div>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                        value={newWidgetGroupBy}
                                        onChange={(e) => setNewWidgetGroupBy(e.target.value as any)}
                                    >
                                        <option value="none">None</option>
                                        {DIMENSION_OPTIONS.filter((o) => o.value !== newWidgetXAxis).map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Y-axis metrics</div>
                                    <div className="border border-gray-200 rounded-lg p-2 max-h-[220px] overflow-auto">
                                        <div className="space-y-2">
                                            {[...TASK_METRIC_OPTIONS, ...additionalMetrics].map((o) => {
                                                const checked = newWidgetMetrics.includes(o.value as MetricKey);
                                                return (
                                                    <label key={o.value} className="flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4"
                                                            checked={checked}
                                                            onChange={() => {
                                                                setNewWidgetMetrics((prev) => {
                                                                    const exists = prev.includes(o.value as MetricKey);
                                                                    const next = exists
                                                                        ? prev.filter((m) => m !== (o.value as MetricKey))
                                                                        : [...prev, o.value as MetricKey];
                                                                    const safe = next.length ? next : (['count'] as MetricKey[]);
                                                                    if (safe.length > 1) setNewWidgetGroupBy('none');
                                                                    return safe;
                                                                });
                                                            }}
                                                        />
                                                        <span>{o.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 text-left"
                                            onClick={() => setShowAddMetricModal(true)}
                                        >
                                            + Add metric
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Filters</div>
                                    <div className="space-y-2">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Status</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetFilterStatus}
                                                onChange={(e) => setNewWidgetFilterStatus(e.target.value as any)}
                                            >
                                                <option value="all">All</option>
                                                <option value="completed">Completed</option>
                                                <option value="pending">Pending</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="on-hold">On Hold</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Priority</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetFilterPriority}
                                                onChange={(e) => setNewWidgetFilterPriority(e.target.value as any)}
                                            >
                                                <option value="all">All Priority</option>
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Assigned</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetFilterAssignee}
                                                onChange={(e) => setNewWidgetFilterAssignee(e.target.value)}
                                            >
                                                {(trendsOptions.assignees || []).map((a) => (
                                                    <option key={a} value={a === 'all' ? 'all' : a.toLowerCase()}>
                                                        {a === 'all' ? 'Everyone' : a}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Type</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetFilterTaskType}
                                                onChange={(e) => setNewWidgetFilterTaskType(e.target.value)}
                                            >
                                                <option value="all">All Types</option>
                                                {Array.from(
                                                    new Set((tasks || []).map((t) => normalizeText((t as any)?.taskType || (t as any)?.type) || 'Unknown'))
                                                )
                                                    .sort((a, b) => a.localeCompare(b))
                                                    .map((tt) => (
                                                        <option key={tt} value={(tt || 'Unknown').toLowerCase()}>
                                                            {tt}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Company</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetFilterCompany}
                                                onChange={(e) => setNewWidgetFilterCompany(e.target.value)}
                                            >
                                                {(trendsOptions.companies || []).map((c) => (
                                                    <option key={c} value={c === 'all' ? 'all' : (c || 'Unknown').toLowerCase()}>
                                                        {c === 'all' ? 'All Companies' : c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Brand</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetFilterBrand}
                                                onChange={(e) => setNewWidgetFilterBrand(e.target.value)}
                                            >
                                                {(trendsOptions.brands || []).map((b) => (
                                                    <option key={b} value={b === 'all' ? 'all' : (b || 'Unknown').toLowerCase()}>
                                                        {b === 'all' ? 'All Brands' : b}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Date Field</div>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetDateField}
                                                onChange={(e) => setNewWidgetDateField(e.target.value as any)}
                                            >
                                                <option value="createdAt">Created Date</option>
                                                <option value="dueDate">Due Date</option>
                                                <option value="completedAt">Completed Date</option>
                                                <option value="updatedAt">Updated Date</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Start Date</div>
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetStartDate}
                                                onChange={(e) => setNewWidgetStartDate(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">End Date</div>
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                                value={newWidgetEndDate}
                                                onChange={(e) => setNewWidgetEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-white hover:bg-gray-50"
                                    onClick={() => setIsAddWidgetOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg px-4 py-2 text-white bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
                                        const effectiveGroupBy =
                                            newWidgetGroupBy === 'none' &&
                                                (newWidgetChartType === 'stacked_bar' || newWidgetChartType === 'grouped_bar' || newWidgetChartType === 'clustered_bar')
                                                ? (newWidgetXAxis === 'status' ? 'priority' : 'status')
                                                : newWidgetGroupBy;
                                        const autoTitle = getAutoWidgetTitle({
                                            xAxis: newWidgetXAxis,
                                            groupBy: effectiveGroupBy,
                                            metrics: newWidgetMetrics,
                                        });
                                        const finalTitle = (newWidgetTitle || '').toString().trim() || autoTitle;
                                        setCustomWidgets((prev) => [
                                            ...prev,
                                            {
                                                id,
                                                title: finalTitle,
                                                chartType: newWidgetChartType,
                                                xAxis: newWidgetXAxis,
                                                groupBy: effectiveGroupBy,
                                                yEntity: 'task',
                                                metrics: newWidgetMetrics,
                                                showPercent: newWidgetShowPercent,
                                                filters: {
                                                    status: newWidgetFilterStatus,
                                                    priority: newWidgetFilterPriority,
                                                    assignee: newWidgetFilterAssignee,
                                                    taskType: newWidgetFilterTaskType,
                                                    company: newWidgetFilterCompany,
                                                    brand: newWidgetFilterBrand,
                                                    dateField: newWidgetDateField,
                                                    startDate: newWidgetStartDate,
                                                    endDate: newWidgetEndDate,
                                                },
                                            },
                                        ]);
                                        setIsAddWidgetOpen(false);
                                    }}
                                >
                                    Add chart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddMetricModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowAddMetricModal(false);
                    }}
                >
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Metric</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white"
                                    placeholder="e.g., Customer Satisfaction"
                                    value={newMetricLabel}
                                    onChange={(e) => setNewMetricLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddMetric();
                                    }}
                                />
                            </div>
                            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-white hover:bg-gray-50"
                                    onClick={() => setShowAddMetricModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg px-4 py-2 text-white bg-blue-600 hover:bg-blue-700"
                                    onClick={handleAddMetric}
                                >
                                    Add Metric
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyzePage;
