import React, { memo } from 'react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import type { Task, UserType, TaskStatus } from '../Types/Types';
import TaskGridItem from './TaskGridItem';
import TaskListRow from './TaskListRow';

interface TaskVirtualListProps {
    tasks: Task[];
    viewMode: 'grid' | 'list';
    users: UserType[];
    onToggleStatus: (id: string, status: TaskStatus) => Promise<void>;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onSendReminder: (task: Task) => void;
    onOpenComments: (task: Task) => void;
    formatBrand: (task: Task) => string;
    formatDate: (date: string) => string;
    canEditTask: (task: Task) => boolean;
    canMarkTaskDone: (task: Task) => boolean;
    canEditDeleteTask: (task: Task) => boolean;
    canSendReminderForTask: (task: Task) => boolean;
    isSbmUser: boolean;
    sendingReminderByTaskId: Record<string, boolean>;
}

const TaskVirtualList: React.FC<TaskVirtualListProps> = ({
    tasks,
    viewMode,
    users,
    onToggleStatus,
    onDelete,
    onEdit,
    onSendReminder,
    onOpenComments,
    formatBrand,
    formatDate,
    canEditTask,
    canMarkTaskDone,
    canEditDeleteTask,
    canSendReminderForTask,
    isSbmUser,
    sendingReminderByTaskId
}) => {
    if (viewMode === 'grid') {
        return (
            <VirtuosoGrid
                style={{ height: '70vh', width: '100%' }}
                totalCount={tasks.length}
                initialItemCount={Math.min(24, tasks.length)}
                itemClassName="p-2"
                listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                itemContent={(index) => {
                    const task = tasks[index];
                    if (!task) return null;
                    return (
                        <TaskGridItem
                            key={task.id}
                            task={task}
                            users={users}
                            onToggleStatus={onToggleStatus}
                            onDelete={onDelete}
                            onSendReminder={onSendReminder}
                            onOpenComments={onOpenComments}
                            formatBrand={formatBrand}
                            formatDate={formatDate}
                            canMarkTaskDone={canMarkTaskDone}
                            canEditDeleteTask={canEditDeleteTask}
                            canSendReminderForTask={canSendReminderForTask}
                            isSbmUser={isSbmUser}
                            sendingReminder={!!sendingReminderByTaskId[task.id]}
                        />
                    );
                }}
            />
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50/50">
                        <tr className="text-left text-xs font-medium text-gray-500">
                            <th className="px-4 py-3">Task</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3">Due Date</th>
                            <th className="px-4 py-3">Brand</th>
                            <th className="px-4 py-3">Assigned To</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {/* 
                            Note: Direct virtualization inside a table tbody is tricky.
                            Using Virtuoso with custom components for table rows is the recommended way.
                        */}
                    </tbody>
                </table>
                <Virtuoso
                    style={{ height: '70vh' }}
                    totalCount={tasks.length}
                    initialItemCount={Math.min(20, tasks.length)}
                    itemContent={(index) => {
                        const task = tasks[index];
                        if (!task) return null;
                        return (
                            <table className="min-w-full">
                                <tbody className="divide-y divide-gray-50">
                                    <TaskListRow
                                        key={task.id}
                                        task={task}
                                        users={users}
                                        onDelete={onDelete}
                                        onEdit={onEdit}
                                        onSendReminder={onSendReminder}
                                        formatBrand={formatBrand}
                                        formatDate={formatDate}
                                        canEditTask={canEditTask}
                                        canEditDeleteTask={canEditDeleteTask}
                                        canSendReminderForTask={canSendReminderForTask}
                                        sendingReminder={!!sendingReminderByTaskId[task.id]}
                                    />
                                </tbody>
                            </table>
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default memo(TaskVirtualList);
