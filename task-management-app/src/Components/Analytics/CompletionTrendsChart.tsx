import React, { useEffect, useRef } from 'react';
import echarts, { type ECharts } from '../../utils/echarts';
import BaseChartCard from './BaseChartCard';
import type { EChartsOption } from 'echarts';

interface CompletionTrendsChartProps {
    data: {
        labels: string[];
        completed: number[];
        pending: number[];
    };
    granularity: 'daily' | 'weekly' | 'monthly';
    onGranularityChange: (val: 'daily' | 'weekly' | 'monthly') => void;
    assignee: string;
    onAssigneeChange: (val: string) => void;
    assignees: string[];
    company: string;
    onCompanyChange: (val: string) => void;
    companies: string[];
    brand: string;
    onBrandChange: (val: string) => void;
    brands: string[];
    startDate: string;
    onStartDateChange: (val: string) => void;
    endDate: string;
    onEndDateChange: (val: string) => void;
    onDelete: () => void;
    isAdminUser: boolean;
}

const CompletionTrendsChart: React.FC<CompletionTrendsChartProps> = ({
    data,
    granularity,
    onGranularityChange,
    assignee,
    onAssigneeChange,
    assignees,
    company,
    onCompanyChange,
    companies,
    brand,
    onBrandChange,
    brands,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    onDelete,
    isAdminUser
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }

        const hasData = data.labels.length > 0;

        const option: EChartsOption = {
            title: hasData ? undefined : {
                text: 'No data found for the selected filters',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 }
            },
            tooltip: { trigger: 'axis' },
            legend: { top: 'bottom' },
            grid: { left: 50, right: 20, top: 40, bottom: 60, containLabel: true },
            xAxis: {
                type: 'category',
                data: data.labels,
                axisLabel: { 
                    rotate: data.labels.length > 5 ? 45 : 30,
                    interval: 0,
                    hideOverlap: true,
                    overflow: 'break',
                    width: 70
                }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
            },
            series: [
                {
                    name: 'Completed',
                    type: 'line',
                    data: data.completed,
                    smooth: true,
                    itemStyle: { color: '#10b981' },
                    lineStyle: { width: 3 }
                },
                {
                    name: 'Pending',
                    type: 'line',
                    data: data.pending,
                    smooth: true,
                    itemStyle: { color: '#f59e0b' },
                    lineStyle: { width: 3 }
                }
            ]
        };

        chartInstance.current.setOption(option);

        requestAnimationFrame(() => chartInstance.current?.resize());

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            chartInstance.current?.resize();
        });
        if (chartRef.current) resizeObserver.observe(chartRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [data]);

    return (
        <BaseChartCard
            title="Completion trends"
            canDelete={isAdminUser}
            onDelete={onDelete}
            extraActions={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                        value={granularity}
                        onChange={(e) => onGranularityChange(e.target.value as any)}
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all max-w-[100px]"
                        value={assignee}
                        onChange={(e) => onAssigneeChange(e.target.value)}
                    >
                        {assignees.map((a) => (
                            <option key={a} value={a}>
                                {a === 'all' ? 'All Assignees' : a}
                            </option>
                        ))}
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all max-w-[100px]"
                        value={company}
                        onChange={(e) => onCompanyChange(e.target.value)}
                    >
                        {companies.map((c) => (
                            <option key={c} value={c}>
                                {c === 'all' ? 'All Companies' : c}
                            </option>
                        ))}
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all max-w-[100px]"
                        value={brand}
                        onChange={(e) => onBrandChange(e.target.value)}
                    >
                        {brands.map((b) => (
                            <option key={b} value={b}>
                                {b === 'all' ? 'All Brands' : b}
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-1 py-0.5 bg-gray-50/50">
                        <input
                            type="date"
                            className="bg-transparent text-[10px] text-gray-600 outline-none w-[75px]"
                            value={startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                        />
                        <span className="text-gray-400 text-[10px]">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-[10px] text-gray-600 outline-none w-[75px]"
                            value={endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                        />
                    </div>
                </div>
            }
        >
            <div ref={chartRef} className="w-full" style={{ height: 360 }} />
        </BaseChartCard>
    );
};

export default CompletionTrendsChart;
