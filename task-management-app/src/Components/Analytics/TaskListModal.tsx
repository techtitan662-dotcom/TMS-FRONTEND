import React, { useState } from 'react';
import { taskService } from '../../Services/Task.services';

interface Props {
    open: boolean;
    onClose: () => void;
    title?: string;
    tasks: any[];
}

const TaskListModal: React.FC<Props> = ({ open, onClose, title = 'Tasks', tasks }) => {
    const [historyMap, setHistoryMap] = useState<Record<string, { loading: boolean; entries: any[] }>>({});

    const toggleHistory = async (taskId: string) => {
        const current = historyMap[taskId];
        if (current && current.entries.length) {
            // collapse
            setHistoryMap(prev => ({ ...prev, [taskId]: { loading: false, entries: [] } }));
            return;
        }

        setHistoryMap(prev => ({ ...prev, [taskId]: { loading: true, entries: [] } }));
        try {
            const res = await taskService.getTaskHistory(taskId);
            if (res.success) {
                setHistoryMap(prev => ({ ...prev, [taskId]: { loading: false, entries: res.data || [] } }));
            } else {
                setHistoryMap(prev => ({ ...prev, [taskId]: { loading: false, entries: [] } }));
            }
        } catch (err) {
            setHistoryMap(prev => ({ ...prev, [taskId]: { loading: false, entries: [] } }));
        }
    };

    if (!open) return null;

    // Function to check if task is overdue
    const isOverdue = (dueDate: string, status: string) => {
        if (status === 'completed' || status === 'done') return false;
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-[95vw] mx-4 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="text-sm font-semibold text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100">Close</button>
                    </div>
                </div>

                <div className="p-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">
                    {(!tasks || tasks.length === 0) ? (
                        <div className="text-center text-gray-500 py-12">No tasks found for this selection.</div>
                    ) : (
                        <div className="w-full overflow-x-hidden">
                            <table className="w-full table-fixed border-collapse">
                                <thead className="sticky top-0 bg-white z-10">
                                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-200">
                                        <th className="px-3 py-2 text-left" style={{ width: '3%' }}>#</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '12%' }}>Title</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '10%' }}>Assigned To</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '10%' }}>Assigned By</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '12%' }}>Due</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '14%' }}>Created Date</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '14%' }}>Completed Date</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '10%' }}>Status</th>
                                        <th className="px-3 py-2 text-left" style={{ width: '15%' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tasks.map((t, idx) => {
                                        const hid = t.id || t._id || `${idx}`;
                                        const h = historyMap[hid];
                                        const overdue = isOverdue(t.dueDate, t.status);
                                        const statusColor =
                                            t.status === 'completed' || t.status === 'done' ? 'bg-green-100 text-green-700' :
                                                overdue ? 'bg-red-100 text-red-700' :
                                                    t.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                        t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700';

                                        return (
                                            <React.Fragment key={hid}>
                                                <tr className="group hover:bg-gray-50">
                                                    <td className="px-3 py-3 text-sm text-gray-600 align-top break-words">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-800 align-top break-words">
                                                        {t.title || t.taskTitle || t.taskType || 'Untitled'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-600 align-top break-words">
                                                        {t.assignedToName || t.assignedTo?.name || t.assignedTo || 'Unassigned'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-600 align-top break-words">
                                                        {t.assignedByName || t.assignedBy?.name || t.assignedBy || 'Unknown'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm align-top break-words">
                                                        <div className="flex flex-col gap-1">
                                                            <span>{t.dueDate ? new Date(t.dueDate).toLocaleString() : 'Unscheduled'}</span>
                                                            {overdue && t.status !== 'completed' && t.status !== 'done' && (
                                                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block w-fit">
                                                                    ⚠️ OVERDUE
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-600 align-top break-words">
                                                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Unknown'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-600 align-top break-words">
                                                        {t.status === 'completed' || t.status === 'done' ? (t.completedAt ? new Date(t.completedAt).toLocaleString() : (t.updatedAt ? new Date(t.updatedAt).toLocaleString() : 'Unknown')) : '—'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm align-top break-words">
                                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold whitespace-normal break-words ${statusColor}`}>
                                                            {overdue && t.status !== 'completed' && t.status !== 'done' ? 'OVERDUE' : (String(t.status || 'PENDING').toUpperCase())}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-sm align-top">
                                                        <button
                                                            onClick={() => toggleHistory(hid)}
                                                            className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                                        >
                                                            {h && h.entries.length ? 'Hide History' : (h && h.loading ? 'Loading...' : 'View History')}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {h && h.entries && h.entries.length > 0 && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={7} className="px-4 py-4">
                                                            <div className="text-sm text-gray-700">
                                                                <div className="mb-3 font-semibold text-gray-800">📋 History Timeline</div>
                                                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                                    {h.entries.map((e: any, i: number) => (
                                                                        <div key={e.id || i} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                                                                            <div className="text-xs text-gray-500 mb-1">
                                                                                📅 {new Date(e.timestamp || e.createdAt || Date.now()).toLocaleString()}
                                                                            </div>
                                                                            <div className="text-sm font-semibold text-gray-800 mb-1 break-words">
                                                                                {e.action || e.type || e.event || e.title || 'Event'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-600 break-words">
                                                                                {e.message || e.note || e.details || JSON.stringify(e)}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskListModal;