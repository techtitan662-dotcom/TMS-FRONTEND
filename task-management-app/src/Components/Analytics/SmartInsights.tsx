import React from 'react';
import { BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';

interface SmartInsightsProps {
    insights: {
        health: string;
        bottleneckStatus: string;
        bottleneckType: string;
        topPerformer: string;
        performerCount: number;
        topPriority: string;
        overdueHighPriority: number;
        companyName: string;
    };
    summary: {
        total: number;
        rate: number;
        overdue: number;
    };
}

const SmartInsights: React.FC<SmartInsightsProps> = ({ insights, summary }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">Overall Analysis Summary</h3>
                </div>
                <div className="space-y-4">
                    <p className="text-gray-600 leading-relaxed text-sm">
                        {insights.companyName}, the overall team health is{' '}
                        <span
                            className={`font-bold ${
                                insights.health === 'Good'
                                    ? 'text-emerald-600'
                                    : insights.health === 'Critical'
                                    ? 'text-red-600'
                                    : 'text-amber-600'
                            }`}
                        >
                            {insights.health}
                        </span>
                        .
                        {summary.total > 0 && (
                            <>
                                {' '}
                                With a completion rate of <span className="font-bold text-gray-900">{summary.rate}%</span>, the
                                primary bottleneck is currently tasks in{' '}
                                <span className="font-bold text-gray-900 capitalize">
                                    "{insights.bottleneckStatus || 'N/A'}"
                                </span>{' '}
                                status. Most task activities are related to{' '}
                                <span className="font-bold text-gray-900">"{insights.bottleneckType || 'N/A'}"</span>. The
                                majority of tasks are categorized as{' '}
                                <span className="font-bold text-gray-900 capitalize">"{insights.topPriority || 'N/A'}"</span>{' '}
                                priority.
                            </>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {insights.topPerformer && (
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs text-emerald-800">
                                    <span className="font-bold">{insights.topPerformer}</span> is the top performer (
                                    {insights.performerCount} completions)
                                </span>
                            </div>
                        )}
                        {summary.overdue > 0 && (
                            <div className="bg-red-50 p-3 rounded-xl border border-red-100 inline-flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-red-800 font-medium">
                                        <span className="font-bold">{summary.overdue}</span> critical tasks are overdue
                                    </span>
                                    {insights.overdueHighPriority > 0 && (
                                        <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">
                                            Includes {insights.overdueHighPriority} High/Urgent tasks
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
                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="transparent"
                            stroke={
                                insights?.health === 'Good'
                                    ? '#10b981'
                                    : insights?.health === 'Critical'
                                    ? '#ef4444'
                                    : '#f59e0b'
                            }
                            strokeWidth="12"
                            strokeDasharray={439.8}
                            strokeDashoffset={439.8 - (439.8 * summary.rate) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-bold text-gray-900">{summary.rate}%</span>
                        <span className="text-[10px] text-gray-400 font-medium">DONE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartInsights;
