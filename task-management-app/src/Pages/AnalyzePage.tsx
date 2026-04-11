import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PlusCircle, 
    Building2, 
    Calendar, 
    CalendarClock,
    Loader2
} from 'lucide-react';
import ManagerAnalysisChart from '../Components/ManagerAnalysisChart';
import type { Task, UserType } from '../Types/Types';
import apiClient from '../Services/apiClient';
import toast from 'react-hot-toast';

// Modular Components
import OverdueByUserChart from '../Components/Analytics/OverdueByUserChart';
import AssignByChart from '../Components/Analytics/AssignByChart';
import AssignedChart from '../Components/Analytics/AssignedChart';
import AssignedToChart from '../Components/Analytics/AssignedToChart';
import CompletionTrendsChart from '../Components/Analytics/CompletionTrendsChart';
import LeaderboardChart from '../Components/Analytics/LeaderboardChart';
import StatusBreakdownChart from '../Components/Analytics/StatusBreakdownChart';
import CustomWidgetChart from '../Components/Analytics/CustomWidgetChart';
import SummaryCards from '../Components/Analytics/SummaryCards';
import SmartInsights from '../Components/Analytics/SmartInsights';
import PerformanceReport from '../Components/Analytics/PerformanceReport';

// Utilities & Types
import {
    type ChartType,
    type DimensionKey,
    type CustomWidget,
    CHART_TYPE_OPTIONS,
    ADD_WIDGET_CHART_TYPE_OPTIONS,
    DIMENSION_OPTIONS,
    normalizeText,
    extractUserLabel,
    getCompletionStatus,
    buildOptionForWidget,
    getAutoWidgetTitle,
    mapDimensionToFilters
} from '../Components/Analytics/ChartUtils';

const CUSTOM_WIDGETS_STORAGE_KEY = 'analyze_custom_widgets_v1';
const HIDDEN_BUILTIN_CHARTS_STORAGE_KEY = 'analyze_hidden_builtin_charts_v1';

const BUILTIN_CHARTS = [
    { key: 'assign_by', label: 'Assign By' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'completion_trends', label: 'Completion trends' },
    { key: 'manager_analysis', label: 'Manager analysis' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'status_breakdown', label: 'Status breakdown' },
    { key: 'overdue_by_company', label: 'Overdue by company' },
];

export interface AnalyzePageProps {
    tasks: Task[];
    users?: UserType[];
    apiCompanies?: string[];
    currentUserEmail?: string;
    currentUserRole?: string;
}

const AnalyzePage: FC<AnalyzePageProps> = ({ tasks: tasksProp, users = [], apiCompanies, currentUserEmail: currentUserEmailProp, currentUserRole }) => {
    const navigate = useNavigate();
    
    // Global Filter State
    const [globalCompany, setGlobalCompany] = useState<string>('all');
    const [globalTimePeriod, setGlobalTimePeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
    const [globalStartDate, setGlobalStartDate] = useState<string>('');
    const [globalEndDate, setGlobalEndDate] = useState<string>('');
    const [globalDateField] = useState<'createdAt' | 'dueDate' | 'completedAt' | 'updatedAt'>('createdAt');
    const [globalMonth, setGlobalMonth] = useState<string>(new Date().toISOString().substring(0, 7));
    const [remoteTasks, setRemoteTasks] = useState<Task[] | null>(null);
    const [isFetchingReport, setIsFetchingReport] = useState(false);
    
    // Local Chart Selection/Filter State
    const [overdueChartCompany, setOverdueChartCompany] = useState<string>('all');
    const [assignByChartType, setAssignByChartType] = useState<ChartType>('bar');
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
    const [reportFilterCompany, setReportFilterCompany] = useState<string>('all');

    // Custom Widget / Management State
    const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([]);
    const [hiddenBuiltinCharts, setHiddenBuiltinCharts] = useState<string[]>([]);
    const [hiddenCustomWidgetIds, setHiddenCustomWidgetIds] = useState<string[]>([]);
    const [chartsPerRow, setChartsPerRow] = useState<1 | 2 | 3 | 4>(3);
    const [userHasChangedChartsPerRow, setUserHasChangedChartsPerRow] = useState(false);
    
    const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);

    // New Widget Form State (Simplified)
    const [newWidgetTitle, setNewWidgetTitle] = useState('');
    const [newWidgetChartType, setNewWidgetChartType] = useState<ChartType>('bar');
    const [newWidgetXAxis, setNewWidgetXAxis] = useState<DimensionKey>('status');
    const [newWidgetGroupBy, setNewWidgetGroupBy] = useState<DimensionKey | 'none'>('none');
    
    const gridRef = useRef<HTMLDivElement>(null);

    const tasks = useMemo(() => remoteTasks || tasksProp, [remoteTasks, tasksProp]);

    const isAdminUser = useMemo(() => {
        const r = (currentUserRole || '').toString().trim().toLowerCase();
        return r === 'admin' || r === 'super admin' || r === 'superadmin';
    }, [currentUserRole]);

    const storageUserKey = useMemo(() => {
        const raw = (currentUserEmailProp || '').toString().trim().toLowerCase();
        return raw || 'anonymous';
    }, [currentUserEmailProp]);

    const hiddenBuiltinStorageKey = `${HIDDEN_BUILTIN_CHARTS_STORAGE_KEY}::${storageUserKey}`;

    // Data Processing Helpers
    const companies = useMemo(() => {
        if (apiCompanies && apiCompanies.length > 0) return apiCompanies;
        const map = new Map<string, string>();
        (tasks || []).forEach((t: any) => {
            const raw = (t.companyName || t.company || '').toString().trim();
            if (!raw) return;
            const key = raw.toLowerCase();
            if (!map.has(key)) map.set(key, raw);
        });
        return Array.from(map.values()).sort();
    }, [tasks, apiCompanies]);

    const effectiveDateRange = useMemo(() => {
        if (globalTimePeriod === 'all') return { start: '', end: '' };
        if (globalTimePeriod === 'custom') return { start: globalStartDate, end: globalEndDate };

        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (globalTimePeriod === 'daily') {
            start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
        } else if (globalTimePeriod === 'weekly') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff); start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        } else if (globalTimePeriod === 'monthly') {
            const [year, month] = globalMonth.split('-').map(Number);
            start.setFullYear(year, month - 1, 1); start.setHours(0, 0, 0, 0);
            end.setFullYear(year, month, 0); end.setHours(23, 59, 59, 999);
        }

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        return { start: formatDate(start), end: formatDate(end) };
    }, [globalTimePeriod, globalStartDate, globalEndDate, globalMonth]);

    const filteredTasksByGlobalDates = useMemo(() => {
        let list = tasks;
        if (globalCompany !== 'all') {
            const filterLower = globalCompany.toLowerCase();
            list = list.filter((t: any) => (t.companyName || t.company || '').toString().trim().toLowerCase() === filterLower);
        }
        const { start, end } = effectiveDateRange;
        if (start || end) {
            list = list.filter((t: any) => {
                const dateVal = t[globalDateField];
                if (!dateVal) return false;
                const d = new Date(dateVal).getTime();
                if (start && d < new Date(start).getTime()) return false;
                if (end && d > new Date(end).setHours(23, 59, 59, 999)) return false;
                return true;
            });
        }
        return list;
    }, [tasks, globalCompany, effectiveDateRange, globalDateField]);

    const globalSummary = useMemo(() => {
        const total = filteredTasksByGlobalDates.length;
        const completed = filteredTasksByGlobalDates.filter((t) => normalizeText(t.status).toLowerCase() === 'completed').length;
        const pending = filteredTasksByGlobalDates.filter((t) => normalizeText(t.status).toLowerCase() === 'pending').length;
        const overdue = filteredTasksByGlobalDates.filter((t) => getCompletionStatus(t) === 'Overdue').length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, pending, overdue, rate };
    }, [filteredTasksByGlobalDates]);

    const smartInsights = useMemo(() => {
        if (!filteredTasksByGlobalDates.length) return null;
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
            if ((p === 'high' || p === 'urgent') && getCompletionStatus(t) === 'Overdue') overdueHighPriority++;
            const type = normalizeText(t.taskType || t.type);
            if (type) typeMap[type] = (typeMap[type] || 0) + 1;
            if (s === 'completed') {
                const u = extractUserLabel(t.assignedTo, t.assignedToName);
                if (u && u !== 'Unknown') userMap[u] = (userMap[u] || 0) + 1;
            }
        });

        const getTop = (map: Record<string, number>) => {
            let max = 0, topKey = '';
            for (const k in map) { if (map[k] > max) { max = map[k]; topKey = k; } }
            return { key: topKey, value: max };
        };

        const topStatus = getTop(statusMap);
        const topType = getTop(typeMap);
        const topUser = getTop(userMap);
        const topPriority = getTop(priorityMap);

        return {
            health: globalSummary.rate > 60 ? 'Good' : globalSummary.rate > 30 ? 'Attention Needed' : 'Critical',
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
        const userMap: Record<string, any> = {};
        const userRoleMap = new Map<string, string>();
        users.forEach(u => {
            const email = String(u.email || '').toLowerCase().trim();
            if (email) userRoleMap.set(email, String(u.role || '').trim());
        });

        let reportTasks = filteredTasksByGlobalDates;
        if (reportFilterCompany !== 'all') {
            reportTasks = reportTasks.filter(t => normalizeText(t.companyName || t.company).toLowerCase() === reportFilterCompany.toLowerCase());
        }

        reportTasks.forEach(t => {
            const u = extractUserLabel(t.assignedTo, t.assignedToName) || 'Unassigned';
            if (!userMap[u]) {
                let role = normalizeText((t as any)?.assignedTo?.role);
                if (!role || role.toLowerCase() === 'unknown') {
                    const email = normalizeText(typeof t.assignedTo === 'string' ? t.assignedTo : (t as any).assignedTo?.email).toLowerCase();
                    if (email && userRoleMap.has(email)) role = userRoleMap.get(email)!;
                }
                userMap[u] = { name: u, role: role || 'No Role', total: 0, completed: 0, pending: 0, reassigned: 0, pendingApproval: 0, overdue: 0, overdueCompleted: 0 };
            }
            userMap[u].total++;
            const status = normalizeText(t.status).toLowerCase();
            const isCompleted = status === 'completed' || status === 'done';
            if (isCompleted) userMap[u].completed++;
            else if (status === 'pending') userMap[u].pending++;
            else if (status === 'reassigned') userMap[u].reassigned++;

            const isReviewableRole = (userMap[u].role || '').toLowerCase().includes('manager') || (userMap[u].role || '').toLowerCase().includes('assistant');
            if (isReviewableRole && isCompleted && !(t as any).reviewStars) userMap[u].pendingApproval++;
            if (getCompletionStatus(t) === 'Overdue') userMap[u].overdue++;
            if (isCompleted) {
                const due = new Date(normalizeText((t as any)?.dueDate));
                const cmp = new Date(normalizeText((t as any)?.completedAt || (t as any)?.updatedAt));
                if (!isNaN(due.getTime()) && !isNaN(cmp.getTime()) && cmp > due) userMap[u].overdueCompleted++;
            }
        });
        return Object.values(userMap).map(u => ({ ...u, rate: u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0 })).sort((a, b) => b.completed - a.completed);
    }, [filteredTasksByGlobalDates, reportFilterCompany, users]);

    const groupedUserReportData = useMemo(() => {
        const groups: Record<string, any[]> = {};
        userReportData.forEach(row => {
            const role = row.role || 'No Role';
            if (!groups[role]) groups[role] = [];
            groups[role].push(row);
        });
        return groups;
    }, [userReportData]);

    const handleExportReport = () => {
        if (!userReportData.length) return;
        const headers = ['User', 'Role', 'Total Tasks', 'Completed', 'Pending', 'Reassigned', 'Pending Approval', 'Overdue', 'Overdue Completed', 'Success Rate (%)'];
        const rows = userReportData.map(r => [r.name, r.role, r.total, r.completed, r.pending, r.reassigned, r.pendingApproval, r.overdue, r.overdueCompleted, r.rate]);
        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `User_Performance_Report_${reportFilterCompany}_${globalMonth}.csv`;
        link.click();
    };

    const fetchCustomReport = async () => {
        if (!globalStartDate || !globalEndDate) { toast.error("Select date range"); return; }
        setIsFetchingReport(true);
        try {
            const res = await apiClient.post('/task/custom-report', { startDate: globalStartDate, endDate: globalEndDate });
            if (res.data.success && res.data.jobId) {
                const poll = setInterval(async () => {
                    apiClient.get(`/task/custom-report/${res.data.jobId}`).then(s => {
                        if (s.data.status === 'completed') {
                            clearInterval(poll); setRemoteTasks(s.data.data?.tasks || []); setIsFetchingReport(false); toast.success("Data loaded");
                        } else if (s.data.status === 'failed') { clearInterval(poll); setIsFetchingReport(false); toast.error("Failed"); }
                    });
                }, 3000);
            } else { setIsFetchingReport(false); toast.error("Failed to start"); }
        } catch { setIsFetchingReport(false); toast.error("Error"); }
    };

    // Chart Data Preparation
    const overdueByCategoryData = useMemo(() => {
        const map = new Map<string, number>();
        filteredTasksByGlobalDates.forEach(t => {
            if (getCompletionStatus(t) === 'Overdue') {
                if (overdueChartCompany !== 'all' && normalizeText((t as any).companyName || (t as any).company).toLowerCase() !== overdueChartCompany.toLowerCase()) return;
                const cat = normalizeText((t as any).category) || 'General';
                map.set(cat, (map.get(cat) || 0) + 1);
            }
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
    }, [filteredTasksByGlobalDates, overdueChartCompany]);

    const creatorCounts = useMemo(() => {
        const map = new Map<string, number>();
        filteredTasksByGlobalDates.forEach(t => {
            const u = extractUserLabel(t.assignedBy, t.assignedByName);
            map.set(u, (map.get(u) || 0) + 1);
        });
        const categories = Array.from(map.keys()).sort();
        const data = categories.map(c => map.get(c)!);
        return { categories, data };
    }, [filteredTasksByGlobalDates]);

    const assignedByMeToMe = useMemo(() => {
        const me = (currentUserEmailProp || '').toLowerCase();
        let byMe = 0, toMe = 0;
        filteredTasksByGlobalDates.forEach((t: any) => {
            if (normalizeText(t.assignedBy?.email || t.assignedBy).toLowerCase() === me) byMe++;
            if (normalizeText(t.assignedTo?.email || t.assignedTo).toLowerCase() === me) toMe++;
        });
        return { byMe, toMe };
    }, [filteredTasksByGlobalDates, currentUserEmailProp]);

    const assignedToByMeData = useMemo(() => {
        const me = (currentUserEmailProp || '').toLowerCase();
        const map = new Map<string, number>();
        filteredTasksByGlobalDates.forEach((t: any) => {
            if (normalizeText(t.assignedBy?.email || t.assignedBy).toLowerCase() === me) {
                const u = extractUserLabel(t.assignedTo, t.assignedToName);
                map.set(u, (map.get(u) || 0) + 1);
            }
        });
        const categories = Array.from(map.keys()).sort();
        const data = categories.map(c => map.get(c)!);
        return { categories, data };
    }, [filteredTasksByGlobalDates, currentUserEmailProp]);

    const trendsOptions = useMemo(() => {
        const assigneesMap = new Map<string, string>();
        const companiesMap = new Map<string, string>();
        const brandsMap = new Map<string, string>();
        
        assigneesMap.set('all', 'all');
        companiesMap.set('all', 'all');
        brandsMap.set('all', 'all');

        tasks.forEach((t: any) => {
            const u = extractUserLabel(t.assignedTo, t.assignedToName);
            if (u) {
                const uk = u.toLowerCase();
                if (!assigneesMap.has(uk)) assigneesMap.set(uk, u);
            }
            
            const c = (t.companyName || t.company || '').toString().trim();
            if (c) {
                const ck = c.toLowerCase();
                if (!companiesMap.has(ck)) companiesMap.set(ck, c);
            }
            
            const b = (t.brand || '').toString().trim();
            if (b) {
                const bk = b.toLowerCase();
                if (!brandsMap.has(bk)) brandsMap.set(bk, b);
            }
        });

        return { 
            assignees: Array.from(assigneesMap.values()).sort(), 
            companies: apiCompanies && apiCompanies.length > 0 ? ['all', ...apiCompanies] : Array.from(companiesMap.values()).sort(), 
            brands: Array.from(brandsMap.values()).sort() 
        };
    }, [tasks, apiCompanies]);

    const completionTrendsData = useMemo(() => {
        let list = tasks;
        if (trendsAssignee !== 'all') list = list.filter(t => extractUserLabel(t.assignedTo, t.assignedToName) === trendsAssignee);
        if (trendsCompany !== 'all') list = list.filter((t: any) => normalizeText(t.companyName || t.company) === trendsCompany);
        if (trendsBrand !== 'all') list = list.filter((t: any) => normalizeText(t.brand) === trendsBrand);
        if (trendsStartDate) list = list.filter(t => new Date(t.createdAt).getTime() >= new Date(trendsStartDate).getTime());
        if (trendsEndDate) list = list.filter(t => new Date(t.createdAt).getTime() <= new Date(trendsEndDate).setHours(23, 59, 59, 999));

        const map = new Map<string, { total: number; completed: number }>();
        list.forEach((t: any) => {
            const d = new Date(t.createdAt);
            let key = d.toISOString().split('T')[0];
            if (trendsGranularity === 'weekly') {
                const start = new Date(d); start.setDate(d.getDate() - d.getDay()); key = start.toISOString().split('T')[0];
            } else if (trendsGranularity === 'monthly') {
                key = d.toISOString().substring(0, 7);
            }
            if (!map.has(key)) map.set(key, { total: 0, completed: 0 });
            const entry = map.get(key)!;
            entry.total++;
            if (normalizeText(t.status).toLowerCase() === 'completed') entry.completed++;
        });
        const sorted = Array.from(map.entries()).sort();
        return {
            labels: sorted.map(([date]) => date),
            completed: sorted.map(([,v]) => v.completed),
            pending: sorted.map(([,v]) => v.total - v.completed)
        };
    }, [tasks, trendsGranularity, trendsAssignee, trendsCompany, trendsBrand, trendsStartDate, trendsEndDate]);

    const leaderboardData = useMemo(() => {
        let list = tasks;
        if (leaderboardCompany !== 'all') list = list.filter((t: any) => normalizeText(t.companyName || t.company) === leaderboardCompany);
        if (leaderboardBrand !== 'all') list = list.filter((t: any) => normalizeText(t.brand) === leaderboardBrand);
        if (leaderboardStartDate) list = list.filter(t => new Date(t.createdAt).getTime() >= new Date(leaderboardStartDate).getTime());
        if (leaderboardEndDate) list = list.filter(t => new Date(t.createdAt).getTime() <= new Date(leaderboardEndDate).setHours(23, 59, 59, 999));

        const map = new Map<string, { total: number; completed: number }>();
        list.forEach(t => {
            const u = extractUserLabel(t.assignedTo, t.assignedToName);
            if (!map.has(u)) map.set(u, { total: 0, completed: 0 });
            map.get(u)!.total++;
            if (normalizeText(t.status).toLowerCase() === 'completed') map.get(u)!.completed++;
        });

        const rows = Array.from(map.entries()).map(([name, vals]) => ({
            name,
            value: leaderboardMetric === 'completed' ? vals.completed : Math.round((vals.completed / vals.total) * 100)
        })).sort((a,b) => b.value - a.value).slice(0, leaderboardTopN);

        return { categories: rows.map(r => r.name), values: rows.map(r => r.value), metricLabel: leaderboardMetric === 'completed' ? 'Tasks Completed' : 'Completion Rate (%)' };
    }, [tasks, leaderboardMetric, leaderboardCompany, leaderboardBrand, leaderboardStartDate, leaderboardEndDate, leaderboardTopN]);

    const statusBreakdownData = useMemo(() => {
        let list = tasks;
        if (performanceStartDate) list = list.filter(t => new Date(t.createdAt).getTime() >= new Date(performanceStartDate).getTime());
        if (performanceEndDate) list = list.filter(t => new Date(t.createdAt).getTime() <= new Date(performanceEndDate).setHours(23, 59, 59, 999));

        const groups = new Set<string>();
        const statusMap = new Map<string, Map<string, number>>();

        list.forEach((t: any) => {
            const g = normalizeText(performanceGroupBy === 'company' ? (t.companyName || t.company) : t.brand) || 'Other';
            const s = normalizeText(t.status).toLowerCase() || 'other';
            groups.add(g);
            if (!statusMap.has(g)) statusMap.set(g, new Map());
            const gMap = statusMap.get(g)!;
            gMap.set(s, (gMap.get(s) || 0) + 1);
        });

        const categories = Array.from(groups).sort();
        const statuses = ['completed', 'pending', 'in-progress', 'on-hold', 'cancelled'];
        const series = statuses.map(s => ({
            name: s.charAt(0).toUpperCase() + s.slice(1),
            data: categories.map(cat => statusMap.get(cat)?.get(s) || 0)
        }));

        return { categories, series };
    }, [tasks, performanceGroupBy, performanceStartDate, performanceEndDate]);

    // Local Storage & Hidden Logic
    useEffect(() => {
        try {
            const raw = localStorage.getItem(CUSTOM_WIDGETS_STORAGE_KEY);
            if (raw) setCustomWidgets(JSON.parse(raw));
        } catch { }
    }, []);

    useEffect(() => {
        localStorage.setItem(CUSTOM_WIDGETS_STORAGE_KEY, JSON.stringify(customWidgets));
    }, [customWidgets]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(hiddenBuiltinStorageKey);
            if (raw) setHiddenBuiltinCharts(JSON.parse(raw));
            else setHiddenBuiltinCharts([]);
        } catch { }
    }, [hiddenBuiltinStorageKey]);

    useEffect(() => {
        localStorage.setItem(hiddenBuiltinStorageKey, JSON.stringify(hiddenBuiltinCharts));
    }, [hiddenBuiltinCharts, hiddenBuiltinStorageKey]);

    const hiddenBuiltinSet = new Set(hiddenBuiltinCharts);
    const hiddenCustomWidgetSet = new Set(hiddenCustomWidgetIds);

    const toggleBuiltinChart = (key: string) => {
        if (!isAdminUser) return;
        setHiddenBuiltinCharts(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const toggleCustomWidgetHidden = (id: string) => {
        if (!isAdminUser) return;
        setHiddenCustomWidgetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Responsive Grid Logic
    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            let best: 1|2|3|4 = 1;
            if (w < 768) best = 1;
            else if (w < 1200) best = 2;
            else if (w < 1600) best = 3;
            else best = 4;
            if (!userHasChangedChartsPerRow) setChartsPerRow(best);
        };
        update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
    }, [userHasChangedChartsPerRow]);

    const navigateToTasks = (args: any) => {
        const params = new URLSearchParams();
        Object.entries(args).forEach(([k, v]) => { if (v) params.set(k, v as string); });
        navigate(`/tasks?${params.toString()}`);
    };

    return (
        <div className="space-y-6 pb-12 w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-gray-500 font-medium">Insights and metrics overview</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-2 bg-gray-100/80 p-1 rounded-xl border border-gray-200 shadow-sm">
                        {[1, 2, 3, 4].map(n => (
                            <button
                                key={n}
                                onClick={() => { setChartsPerRow(n as any); setUserHasChangedChartsPerRow(true); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartsPerRow === n ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    {isAdminUser && (
                        <button
                            onClick={() => setIsAddWidgetOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <PlusCircle className="h-5 w-5" />
                            <span>Add Chart</span>
                        </button>
                    )}
                </div>
            </div>

            <SummaryCards {...globalSummary} />

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-6">
                <div className="flex flex-col gap-2 min-w-[220px]">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Building2 className="h-3 w-3" /> Company Filter
                    </div>
                    <select
                        value={globalCompany}
                        onChange={(e) => setGlobalCompany(e.target.value)}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none transition-all"
                    >
                        <option value="all">All Companies</option>
                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Calendar className="h-3 w-3" /> Time Period
                    </div>
                    <select
                        value={globalTimePeriod}
                        onChange={(e) => setGlobalTimePeriod(e.target.value as any)}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none transition-all"
                    >
                        <option value="all">All Time</option>
                        <option value="daily">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                {globalTimePeriod === 'monthly' && (
                    <div className="flex flex-col gap-2 min-w-[180px]">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <CalendarClock className="h-3 w-3" /> Month
                        </div>
                        <input
                            type="month"
                            value={globalMonth}
                            onChange={(e) => setGlobalMonth(e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all font-mono"
                        />
                    </div>
                )}

                {globalTimePeriod === 'custom' && (
                    <div className="flex items-end gap-3">
                        <div className="flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start</div>
                            <input type="date" value={globalStartDate} onChange={(e) => setGlobalStartDate(e.target.value)} className="bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End</div>
                            <input type="date" value={globalEndDate} onChange={(e) => setGlobalEndDate(e.target.value)} className="bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700" />
                        </div>
                        <button onClick={fetchCustomReport} disabled={isFetchingReport} className="mb-0.5 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2">
                            {isFetchingReport && <Loader2 className="w-4 h-4 animate-spin" />} Load
                        </button>
                    </div>
                )}

                <button
                    onClick={() => { setGlobalCompany('all'); setGlobalTimePeriod('all'); setRemoteTasks(null); }}
                    className="ml-auto px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                    Reset Filters
                </button>
            </div>

            {smartInsights && <SmartInsights insights={smartInsights} summary={globalSummary} />}

            <PerformanceReport
                data={userReportData}
                groupedData={groupedUserReportData}
                selectedCompany={reportFilterCompany}
                onCompanyChange={setReportFilterCompany}
                companies={companies}
                onExport={handleExportReport}
                currentMonth={globalMonth}
                globalCompany={globalCompany}
            />

            {isAdminUser && (hiddenBuiltinCharts.length > 0 || hiddenCustomWidgetIds.length > 0) && (
                <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hidden Components</div>
                    <div className="flex flex-wrap gap-2">
                        {BUILTIN_CHARTS.filter(c => hiddenBuiltinSet.has(c.key)).map(c => (
                            <button key={c.key} onClick={() => toggleBuiltinChart(c.key)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all">
                                Restore {c.label}
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
                    <OverdueByUserChart
                        data={overdueByCategoryData}
                        companies={companies}
                        selectedCompany={overdueChartCompany}
                        onCompanyChange={setOverdueChartCompany}
                        onDelete={() => toggleBuiltinChart('overdue_by_company')}
                        isAdminUser={isAdminUser}
                    />
                )}

                {!hiddenBuiltinSet.has('assign_by') && (
                    <AssignByChart
                        categories={creatorCounts.categories}
                        values={creatorCounts.data}
                        chartType={assignByChartType}
                        totalTasks={globalSummary.total}
                        onChartTypeChange={setAssignByChartType}
                        onDelete={() => toggleBuiltinChart('assign_by')}
                        isAdminUser={isAdminUser}
                        chartTypeOptions={CHART_TYPE_OPTIONS}
                    />
                )}

                {!hiddenBuiltinSet.has('assigned') && (
                    <AssignedChart
                        categories={['Assigned By Me', 'Assigned To Me']}
                        values={[assignedByMeToMe.byMe, assignedByMeToMe.toMe]}
                        chartType={assignedChartType}
                        onChartTypeChange={setAssignedChartType}
                        onDelete={() => toggleBuiltinChart('assigned')}
                        isAdminUser={isAdminUser}
                        chartTypeOptions={CHART_TYPE_OPTIONS}
                    />
                )}

                {!hiddenBuiltinSet.has('assigned_to') && (
                    <AssignedToChart
                        categories={assignedToByMeData.categories}
                        values={assignedToByMeData.data}
                        chartType={assignedToChartType}
                        onChartTypeChange={setAssignedToChartType}
                        onDelete={() => toggleBuiltinChart('assigned_to')}
                        isAdminUser={isAdminUser}
                        chartTypeOptions={CHART_TYPE_OPTIONS}
                    />
                )}

                {!hiddenBuiltinSet.has('completion_trends') && (
                    <div className={chartsPerRow === 1 ? 'col-span-1' : 'col-span-2'}>
                        <CompletionTrendsChart
                            data={completionTrendsData}
                            granularity={trendsGranularity}
                            onGranularityChange={setTrendsGranularity}
                            assignee={trendsAssignee}
                            onAssigneeChange={setTrendsAssignee}
                            assignees={trendsOptions.assignees}
                            company={trendsCompany}
                            onCompanyChange={setTrendsCompany}
                            companies={trendsOptions.companies}
                            brand={trendsBrand}
                            onBrandChange={setTrendsBrand}
                            brands={trendsOptions.brands}
                            startDate={trendsStartDate}
                            onStartDateChange={setTrendsStartDate}
                            endDate={trendsEndDate}
                            onEndDateChange={setTrendsEndDate}
                            onDelete={() => toggleBuiltinChart('completion_trends')}
                            isAdminUser={isAdminUser}
                        />
                    </div>
                )}

                {!hiddenBuiltinSet.has('leaderboard') && (
                    <LeaderboardChart
                        categories={leaderboardData.categories}
                        values={leaderboardData.values}
                        metricLabel={leaderboardData.metricLabel}
                        metric={leaderboardMetric}
                        onMetricChange={setLeaderboardMetric}
                        company={leaderboardCompany}
                        onCompanyChange={setLeaderboardCompany}
                        companies={trendsOptions.companies}
                        brand={leaderboardBrand}
                        onBrandChange={setLeaderboardBrand}
                        brands={trendsOptions.brands}
                        startDate={leaderboardStartDate}
                        onStartDateChange={setLeaderboardStartDate}
                        endDate={leaderboardEndDate}
                        onEndDateChange={setLeaderboardEndDate}
                        topN={leaderboardTopN}
                        onTopNChange={setLeaderboardTopN}
                        onDelete={() => toggleBuiltinChart('leaderboard')}
                        isAdminUser={isAdminUser}
                    />
                )}

                {!hiddenBuiltinSet.has('status_breakdown') && (
                    <StatusBreakdownChart
                        data={statusBreakdownData}
                        groupBy={performanceGroupBy}
                        onGroupByChange={setPerformanceGroupBy}
                        startDate={performanceStartDate}
                        onStartDateChange={setPerformanceStartDate}
                        endDate={performanceEndDate}
                        onEndDateChange={setPerformanceEndDate}
                        onDelete={() => toggleBuiltinChart('status_breakdown')}
                        isAdminUser={isAdminUser}
                    />
                )}

                {!hiddenBuiltinSet.has('manager_analysis') && (
                    <ManagerAnalysisChart 
                        tasks={filteredTasksByGlobalDates} 
                        canDelete={isAdminUser}
                        onDelete={() => toggleBuiltinChart('manager_analysis')}
                    />
                )}

                {customWidgets.filter(w => !hiddenCustomWidgetSet.has(w.id)).map(w => (
                    <CustomWidgetChart
                        key={w.id}
                        id={w.id}
                        title={w.title || getAutoWidgetTitle({ xAxis: w.xAxis, groupBy: w.groupBy, metrics: w.metrics || [w.metric || 'count'] })}
                        option={buildOptionForWidget(w, tasks)}
                        isAdminUser={isAdminUser}
                        onDelete={() => toggleCustomWidgetHidden(w.id)}
                        onChartClick={(params) => {
                             const filters = mapDimensionToFilters(w.xAxis, params.name);
                             navigateToTasks(filters);
                        }}
                    />
                ))}
            </div>

            {isAdminUser && isAddWidgetOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                     <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                         <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                             <h2 className="text-xl font-bold text-gray-900">Add Custom Perspective</h2>
                             <button onClick={() => setIsAddWidgetOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-light">×</button>
                         </div>
                         <div className="p-6 overflow-y-auto space-y-5">
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Display Title</label>
                                 <input type="text" value={newWidgetTitle} onChange={e => setNewWidgetTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Primary Dimension (X-Axis)</label>
                                 <select value={newWidgetXAxis} onChange={e => setNewWidgetXAxis(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all">
                                     {DIMENSION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                 </select>
                             </div>
                             <div className="flex gap-4">
                                 <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Chart Strategy</label>
                                    <select value={newWidgetChartType} onChange={e => setNewWidgetChartType(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all">
                                        {ADD_WIDGET_CHART_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Y-Entity</label>
                                    <select value="task" disabled className="w-full bg-gray-200 border border-transparent rounded-xl px-4 py-3 text-sm font-semibold text-gray-500 font-mono">
                                        <option value="task">Tasks</option>
                                    </select>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Grouping Strategy</label>
                                 <select value={newWidgetGroupBy} onChange={e => setNewWidgetGroupBy(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all">
                                     <option value="none">None (Individual Bars)</option>
                                     {DIMENSION_OPTIONS.filter(o => o.value !== newWidgetXAxis).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                 </select>
                             </div>
                         </div>
                         <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                             <button onClick={() => setIsAddWidgetOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all">Cancel</button>
                             <button
                                onClick={() => {
                                    const id = `cw_${Date.now()}`;
                                    setCustomWidgets([...customWidgets, { 
                                        id, 
                                        title: newWidgetTitle || getAutoWidgetTitle({ xAxis: newWidgetXAxis, groupBy: newWidgetGroupBy, metrics: ['count'] }),
                                        chartType: newWidgetChartType,
                                        xAxis: newWidgetXAxis,
                                        groupBy: newWidgetGroupBy,
                                        yEntity: 'task',
                                        metrics: ['count']
                                    }]);
                                    setIsAddWidgetOpen(false);
                                }}
                                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                             > Generate Perspective </button>
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};

export default AnalyzePage;
