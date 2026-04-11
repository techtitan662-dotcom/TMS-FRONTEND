import React, { useEffect, useRef } from 'react';
import echarts, { type ECharts } from '../../utils/echarts';
import type { EChartsOption } from 'echarts';
import { AlertCircle } from 'lucide-react';
import BaseChartCard from './BaseChartCard';

interface OverdueByUserChartProps {
    data: { name: string; count: number }[];
    companies: string[];
    selectedCompany: string;
    onCompanyChange: (company: string) => void;
    onDelete: () => void;
    isAdminUser: boolean;
}

const OverdueByUserChart: React.FC<OverdueByUserChartProps> = ({
    data,
    companies,
    selectedCompany,
    onCompanyChange,
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

        const hasData = data.length > 0;
        
        const option: EChartsOption = {
            title: hasData ? undefined : {
                text: 'No overdue tasks found',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 }
            },
            tooltip: { trigger: 'axis' },
            grid: { left: 40, right: 20, top: 30, bottom: 80 },
            xAxis: {
                type: 'category',
                data: data.map(d => d.name),
                axisLabel: { rotate: 30 }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
            },
            series: [
                {
                    name: 'Overdue Tasks',
                    data: data.map(d => d.count),
                    type: 'bar',
                    barMaxWidth: 50,
                    itemStyle: { color: '#ef4444' }
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
            title={
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Overdue Tasks by User</h2>
                </div>
            }
            canDelete={isAdminUser}
            onDelete={onDelete}
            extraActions={
                isAdminUser && (
                    <select
                        value={selectedCompany}
                        onChange={(e) => onCompanyChange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Companies</option>
                        {companies.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                )
            }
        >
            <div ref={chartRef} className="w-full" style={{ height: 360 }} />
        </BaseChartCard>
    );
};

export default OverdueByUserChart;
