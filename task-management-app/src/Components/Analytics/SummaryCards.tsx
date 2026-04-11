import React from 'react';
import { BarChart3, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface SummaryCardsProps {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    rate: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
    total,
    completed,
    pending,
    overdue,
    rate
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BarChart3 className="h-12 w-12 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500 mb-1">Total Tasks</span>
                <span className="text-2xl font-bold text-gray-900">{total}</span>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-600 mb-1">Completed</span>
                <span className="text-2xl font-bold text-gray-900">{completed}</span>
                <div className="mt-4 h-1.5 w-full bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock className="h-12 w-12 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-amber-600 mb-1">Pending</span>
                <span className="text-2xl font-bold text-gray-900">{pending}</span>
                <div className="mt-4 h-1.5 w-full bg-amber-50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%` }} />
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <span className="text-sm font-medium text-red-600 mb-1">Overdue</span>
                <span className="text-2xl font-bold text-gray-900">{overdue}</span>
                <div className="mt-4 h-1.5 w-full bg-red-50 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${total > 0 ? (overdue / total) * 100 : 0}%` }} />
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col bg-emerald-50/20">
                <span className="text-sm font-medium text-emerald-700 mb-1">Completion Rate</span>
                <span className="text-3xl font-bold text-emerald-700">{rate}%</span>
                <div className="mt-4 h-2 w-full bg-white rounded-full overflow-hidden border border-emerald-100">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                </div>
                <p className="text-[10px] text-emerald-600 mt-2 font-medium uppercase tracking-tighter">Overall Efficiency</p>
            </div>
        </div>
    );
};

export default SummaryCards;
