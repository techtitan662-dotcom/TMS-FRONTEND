import React, { memo } from 'react';
import {  VirtuosoGrid, TableVirtuoso } from 'react-virtuoso';
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
                <TableVirtuoso
                    style={{ height: '70vh' }}
                    data={tasks}
                    initialItemCount={Math.min(20, tasks.length)}
                    fixedHeaderContent={() => (
                        <tr className="text-left text-xs font-medium text-gray-500">
                            <th className="px-4 py-3 bg-gray-50/50">Task</th>
                            <th className="px-4 py-3 bg-gray-50/50">Status</th>
                            <th className="px-4 py-3 bg-gray-50/50">Priority</th>
                            <th className="px-4 py-3 bg-gray-50/50">Due Date</th>
                            <th className="px-4 py-3 bg-gray-50/50">Brand</th>
                            <th className="px-4 py-3 bg-gray-50/50">Assigned To</th>
                            <th className="px-4 py-3 text-right bg-gray-50/50">Actions</th>
                        </tr>
                    )}
                    itemContent={(_index, task) => (
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
                    )}
                    components={{
                        Table: (props) => <table {...props} className="min-w-full" />,
                        TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-gray-50" />),
                        TableRow: (props) => <tr {...props} className="hover:bg-gray-50/50 transition-colors group" />,
                    }}
                />
            </div>
        </div>
    );
};

export default memo(TaskVirtualList);
