import React, { useEffect, useRef } from 'react';
import echarts, { type ECharts } from '../../utils/echarts';
import BaseChartCard from './BaseChartCard';
import type { EChartsOption } from 'echarts';

interface CustomWidgetChartProps {
    id: string;
    title: string;
    option: EChartsOption;
    onDelete: () => void;
    isAdminUser: boolean;
    onChartClick?: (params: any) => void;
}

const CustomWidgetChart: React.FC<CustomWidgetChartProps> = ({
    title,
    option,
    onDelete,
    isAdminUser,
    onChartClick
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }

        chartInstance.current.setOption(option, true);

        if (onChartClick) {
            chartInstance.current.off('click');
            chartInstance.current.on('click', onChartClick);
        }

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            chartInstance.current?.resize();
        });
        resizeObserver.observe(chartRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [option, onChartClick]);

    return (
        <BaseChartCard
            title={title}
            canDelete={isAdminUser}
            onDelete={onDelete}
        >
            <div ref={chartRef} className="w-full" style={{ height: 360 }} />
        </BaseChartCard>
    );
};

export default CustomWidgetChart;
