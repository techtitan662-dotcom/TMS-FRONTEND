import React from 'react';
import { Users, Building2, Download } from 'lucide-react';

interface UserReportRow {
    name: string;
    role: string;
    total: number;
    completed: number;
    pending: number;
    reassigned: number;
    pendingApproval: number;
    overdue: number;
    overdueCompleted: number;
    overdueCompletedRate: number;
    completedBeforeOverdue: number;
    completedBeforeOverdueRate: number;
    rate: number;
}

interface PerformanceReportProps {
    data: UserReportRow[];
    groupedData: Record<string, UserReportRow[]>;
    selectedCompany: string;
    onCompanyChange: (company: string) => void;
    companies: string[];
    onExport: () => void;
    currentMonth: string;
    globalCompany: string;
    onMetricClick?: (userLabel: string, metric: string) => void;
}

const PerformanceReport: React.FC<PerformanceReportProps> = ({
    data,
    groupedData,
    selectedCompany,
    onCompanyChange,
    companies,
    onExport,
    currentMonth,
    globalCompany
    , onMetricClick
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Detailed User Performance Report</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {currentMonth} • {selectedCompany === 'all' ? (globalCompany === 'all' ? 'All Companies' : globalCompany) : selectedCompany}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <select
                            value={selectedCompany}
                            onChange={(e) => onCompanyChange(e.target.value)}
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
                        onClick={onExport}
                        disabled={data.length === 0}
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
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-orange-600">Reassigned</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-blue-600">Pending Approval</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-red-600">Overdue</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-purple-600">Ovre due complete</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-indigo-600">Completed Before Overdue</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Success Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">
                                    No user data found for this selection
                                </td>
                            </tr>
                        ) : (
                            Object.entries(groupedData).map(([role, roleUsers]) => (
                                <React.Fragment key={role}>
                                    <tr className="bg-gray-50/80">
                                        <td colSpan={10} className="px-6 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-y border-gray-100 flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                            ROLE: {role}
                                        </td>
                                    </tr>
                                    {roleUsers.map((row) => (
                                        <tr key={row.name} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                                        {row.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-700">{row.name}</div>
                                                        <div className="text-[10px] text-gray-400">{row.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                                                    {row.total}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => onMetricClick && onMetricClick(row.name, 'completed')}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 hover:opacity-90"
                                                >
                                                    {row.completed}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => onMetricClick && onMetricClick(row.name, 'pending')}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 hover:opacity-90"
                                                >
                                                    {row.pending}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => onMetricClick && onMetricClick(row.name, 'reassigned')}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 hover:opacity-90"
                                                >
                                                    {row.reassigned}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => onMetricClick && onMetricClick(row.name, 'pendingApproval')}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:opacity-90"
                                                >
                                                    {row.pendingApproval}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => onMetricClick && onMetricClick(row.name, 'overdue')}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 font-mono hover:opacity-90"
                                                >
                                                    {row.overdue}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex flex-col items-center">
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => onMetricClick && onMetricClick(row.name, 'overdueCompleted')}
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 font-mono hover:opacity-90"
                                                        >
                                                            {row.overdueCompleted}
                                                        </button>
                                                        <div className="text-[9px] font-bold text-purple-400 mt-0.5">{row.overdueCompletedRate}%</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex flex-col items-center">
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => onMetricClick && onMetricClick(row.name, 'completedBeforeOverdue')}
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 font-mono hover:opacity-90"
                                                        >
                                                            {row.completedBeforeOverdue}
                                                        </button>
                                                        <div className="text-[9px] font-bold text-indigo-400 mt-0.5">{row.completedBeforeOverdueRate}%</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap min-w-[160px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-grow bg-gray-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${row.rate > 75 ? 'bg-emerald-500' : row.rate > 40 ? 'bg-amber-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${row.rate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold ${row.rate > 75 ? 'text-emerald-700' : row.rate > 40 ? 'text-amber-700' : 'text-red-700'
                                                        }`}>
                                                        {row.rate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PerformanceReport;
