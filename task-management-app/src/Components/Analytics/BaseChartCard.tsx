import React, { type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface BaseChartCardProps {
    title: string | ReactNode;
    subtitle?: string;
    onDelete?: () => void;
    canDelete?: boolean;
    children: ReactNode;
    extraActions?: ReactNode;
}

const BaseChartCard: React.FC<BaseChartCardProps> = ({
    title,
    subtitle,
    onDelete,
    canDelete = false,
    children,
    extraActions
}) => {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 lg:p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-fit">
                    {typeof title === 'string' ? (
                        <h2 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]" title={title}>{title}</h2>
                    ) : (
                        title
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end flex-grow">
                    {extraActions}
                    {canDelete && (
                        <button
                            type="button"
                            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                            onClick={onDelete}
                            title="Hide chart"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            {subtitle && <div className="text-sm text-gray-500 mb-4">{subtitle}</div>}
            <div className="flex-grow w-full">
                {children}
            </div>
        </div>
    );
};

export default BaseChartCard;
