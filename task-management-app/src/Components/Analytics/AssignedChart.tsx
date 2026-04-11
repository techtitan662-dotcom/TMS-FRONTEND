import React, { useEffect, useRef } from 'react';
import echarts, { type ECharts } from '../../utils/echarts';
import BaseChartCard from './BaseChartCard';
import { buildBasicCategoryOption, type ChartType } from './ChartUtils';

interface AssignedChartProps {
    categories: string[];
    values: number[];
    chartType: ChartType;
    onChartTypeChange: (type: ChartType) => void;
    onDelete: () => void;
    isAdminUser: boolean;
    chartTypeOptions: { value: ChartType; label: string }[];
}

const AssignedChart: React.FC<AssignedChartProps> = ({
    categories,
    values,
    chartType,
    onChartTypeChange,
    onDelete,
    isAdminUser,
    chartTypeOptions
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
            seriesName: 'Assigned',
            chartType,
            emptyText: 'No assigned tasks found',
            rotateXAxis: true
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
    }, [categories, values, chartType]);

    return (
        <BaseChartCard
            title="Assigned"
            canDelete={isAdminUser}
            onDelete={onDelete}
            extraActions={
                <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500 whitespace-nowrap">
                        Chart
                        <select
                            className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={chartType}
                            onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
                        >
                            {chartTypeOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="text-xs text-gray-500 font-medium whitespace-nowrap">Assigned by/to you</div>
                </div>
            }
        >
            <div ref={chartRef} className="w-full" style={{ height: 360 }} />
        </BaseChartCard>
    );
};

export default AssignedChart;
