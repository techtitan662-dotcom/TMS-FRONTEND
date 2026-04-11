import React, { useEffect, useRef } from 'react';
import echarts, { type ECharts } from '../../utils/echarts';
import BaseChartCard from './BaseChartCard';
import { buildBasicCategoryOption } from './ChartUtils';

interface LeaderboardChartProps {
    categories: string[];
    values: number[];
    metricLabel: string;
    metric: 'completed' | 'rate';
    onMetricChange: (val: 'completed' | 'rate') => void;
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
    topN: number;
    onTopNChange: (val: number) => void;
    onDelete: () => void;
    isAdminUser: boolean;
}

const LeaderboardChart: React.FC<LeaderboardChartProps> = ({
    categories,
    values,
    metricLabel,
    metric,
    onMetricChange,
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
    topN,
    onTopNChange,
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

        const option = buildBasicCategoryOption({
            categories,
            values,
            seriesName: metricLabel,
            chartType: 'bar',
            emptyText: 'No data found',
            rotateXAxis: true,
            color: '#6366f1' // Indigo/Purple color for leaderboard as seen in image
        });

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
    }, [categories, values, metricLabel]);

    return (
        <BaseChartCard
            title="Leaderboard"
            canDelete={isAdminUser}
            onDelete={onDelete}
            extraActions={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                        value={metric}
                        onChange={(e) => onMetricChange(e.target.value as any)}
                    >
                        <option value="completed">Completed</option>
                        <option value="rate">Rate (%)</option>
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
                    <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Top:</span>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            className="bg-transparent text-[10px] font-bold text-blue-700 outline-none w-[25px]"
                            value={topN}
                            onChange={(e) => onTopNChange(Number(e.target.value) || 5)}
                        />
                    </div>
                </div>
            }
        >
            <div ref={chartRef} className="w-full" style={{ height: 360 }} />
        </BaseChartCard>
    );
};

export default LeaderboardChart;
