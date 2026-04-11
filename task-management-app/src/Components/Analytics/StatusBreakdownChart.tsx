import React, { useEffect, useRef } from 'react';
import echarts, { type ECharts } from '../../utils/echarts';
import BaseChartCard from './BaseChartCard';
import type { EChartsOption } from 'echarts';

interface StatusBreakdownChartProps {
    data: {
        categories: string[];
        series: any[];
    };
    groupBy: 'company' | 'brand';
    onGroupByChange: (val: 'company' | 'brand') => void;
    startDate: string;
    onStartDateChange: (val: string) => void;
    endDate: string;
    onEndDateChange: (val: string) => void;
    onDelete: () => void;
    isAdminUser: boolean;
}

const StatusBreakdownChart: React.FC<StatusBreakdownChartProps> = ({
    data,
    groupBy,
    onGroupByChange,
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

        const hasData = data.categories.length > 0;

        const option: EChartsOption = {
            title: hasData ? undefined : {
                text: 'No data found',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 }
            },
            tooltip: { trigger: 'axis' },
            legend: { top: 'bottom' },
            grid: { left: 50, right: 20, top: 40, bottom: 60, containLabel: true },
            xAxis: {
                type: 'category',
                data: data.categories,
                axisLabel: { 
                    rotate: data.categories.length > 5 ? 45 : 30,
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
            series: data.series
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
            title="Status breakdown"
            canDelete={isAdminUser}
            onDelete={onDelete}
            extraActions={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                        value={groupBy}
                        onChange={(e) => onGroupByChange(e.target.value as any)}
                    >
                        <option value="company">By Company</option>
                        <option value="brand">By Brand</option>
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

export default StatusBreakdownChart;
