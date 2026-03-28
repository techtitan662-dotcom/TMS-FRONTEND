import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  UserCheck,
  ListTodo,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import type { Brand, CommentType, Task, TaskHistory, UserType } from '../Types/Types';
import AllTasksPage from './AllTasksPage';
import { useAppDispatch, useAppSelector } from '../Store/hooks';
import { fetchTasks as fetchTasksThunk, selectAllTasks, selectTasksStatus } from '../Store/tasksSlice';

interface AssignedByMeProps {
  currentUser: UserType;
  users: UserType[];
  brands: Brand[];
  getTaskBorderColor: (task: Task) => string;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  onEditTask?: (task: Task) => void;
  onViewHistory?: (task: Task) => void;
  onOpenComments?: (task: Task) => void;
  onSaveComment: (taskId: string, content: string) => Promise<CommentType>;
  onDeleteComment: (taskId: string, commentId: string) => Promise<void>;
  onFetchTaskComments: (taskId: string) => Promise<CommentType[]>;
  onFetchTaskHistory: (taskId: string) => Promise<TaskHistory[]>;
  onApproveTask: (taskId: string, approve: boolean) => Promise<void>;
  onUpdateTaskApproval: (taskId: string, completedApproval: boolean) => Promise<void>;
  onToggleTaskStatus: (taskId: string, currentStatus: Task['status'], doneByAdmin?: boolean) => Promise<void>;
  advancedFilters?: any;
  onAdvancedFilterChange?: (filterType: string, value: string) => void;
}

const AssignedByMe: React.FC<AssignedByMeProps> = ({
  currentUser,
  users,
  brands,
  getTaskBorderColor,
  formatDate,
  isOverdue,
  onEditTask,
  onSaveComment,
  onDeleteComment,
  onFetchTaskComments,
  onFetchTaskHistory,
  onApproveTask,
  onUpdateTaskApproval,
  onToggleTaskStatus,
  advancedFilters,
  onAdvancedFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(selectAllTasks);
  const tasksStatus = useAppSelector(selectTasksStatus);

  const effectiveStatusFilter = (advancedFilters?.status ?? statusFilter) as string;
  const effectiveDateFilter = (advancedFilters?.date ?? dateFilter) as string;

  useEffect(() => {
    void dispatch(fetchTasksThunk());
  }, [dispatch]);

  const tasks = useMemo(() => {
    if (!currentUser?.email) return [] as Task[];
    return allTasks.filter((t: Task) => {
      const assignedByEmail = typeof t.assignedBy === 'object' ? t.assignedBy?.email : t.assignedBy;
      return assignedByEmail === currentUser.email;
    });
  }, [allTasks, currentUser?.email]);

  const handleApproveTask = useCallback(async (taskId: string, approve: boolean) => {
    await onApproveTask(taskId, approve);
    void dispatch(fetchTasksThunk({ force: true } as any));
  }, [dispatch, onApproveTask]);

  const handleUpdateTaskApproval = useCallback(async (taskId: string, completedApproval: boolean) => {
    await onUpdateTaskApproval(taskId, completedApproval);
    void dispatch(fetchTasksThunk({ force: true } as any));
  }, [dispatch, onUpdateTaskApproval]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'reassigned').length;
    const approvedPending = tasks.filter(t => t.status === 'completed' && !t.completedApproval).length;

    return { total, completed, pending, approvedPending };
  }, [tasks]);

  const overdueCompletedStats = useMemo(() => {
    const statsMap = new Map<string, { name: string; email: string; count: number; avatar?: string }>();
    
    tasks.forEach(task => {
      if (task.status === 'completed' && task.dueDate) {
        const completedAt = (task as any).statusUpdatedAt || task.updatedAt || task.createdAt; 
        if (completedAt && new Date(completedAt) > new Date(task.dueDate)) {
           const assignee = typeof task.assignedTo === 'object' ? task.assignedTo : users.find(u => u.id === task.assignedTo || u.email === task.assignedTo);
           const email = typeof task.assignedTo === 'object' ? task.assignedTo.email : (assignee?.email || task.assignedTo as string);
           const name = typeof task.assignedTo === 'object' ? task.assignedTo.name : (assignee?.name || email);
           const avatar = typeof task.assignedTo === 'object' ? (task.assignedTo as any).avatar : (assignee as any)?.avatar;
           
           if (email) {
             const key = email.toLowerCase();
             const existing = statsMap.get(key) || { name: name || email, email: email, count: 0, avatar };
             existing.count += 1;
             statsMap.set(key, existing);
           }
        }
      }
    });
    
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [tasks, users]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleFilterClick = useCallback((filterType: string, value: string) => {
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(filterType, value);
    } else if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'date') {
      setDateFilter(value);
    }
  }, [onAdvancedFilterChange]);

  if (tasksStatus === 'loading' || tasksStatus === 'idle') {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
          <p className="text-xs text-gray-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#0f2a6e]">Assigned By Me</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Tasks you've assigned to others</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#dbeafe] shadow-sm">
          <UserCheck className="h-3.5 w-3.5 text-[#3b82f6]" />
          <span className="text-[10px] font-medium text-[#0f2a6e]">{stats.total} tasks</span>
        </div>
      </div>

      {/* Stats Cards - Theme Colors */}
      <div className="grid grid-cols-3 gap-2">
        {/* Completed Card */}
        <div
          onClick={() => handleFilterClick('status', 'completed')}
          className={`group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
            effectiveStatusFilter === 'completed'
              ? 'border-[#3b82f6] shadow-md ring-1 ring-[#3b82f6]/20'
              : 'border-[#dbeafe] hover:border-[#3b82f6]/50 hover:shadow-sm'
          }`}
        >
          <div className="p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg ${
                effectiveStatusFilter === 'completed' ? 'bg-[#dbeafe]' : 'bg-[#dbeafe]/50'
              }`}>
                <CheckCircle className={`h-3.5 w-3.5 ${
                  effectiveStatusFilter === 'completed' ? 'text-[#3b82f6]' : 'text-[#60a5fa]'
                }`} />
              </div>
              <ArrowRight className={`h-2.5 w-2.5 text-gray-300 transition-opacity ${
                effectiveStatusFilter === 'completed' ? 'opacity-100 text-[#3b82f6]' : 'opacity-0 group-hover:opacity-100'
              }`} />
            </div>
            <div>
              <p className="text-[9px] font-medium text-gray-500">Completed</p>
              <p className="text-xl font-bold text-[#0f2a6e] mt-0.5">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Pending Card */}
        <div
          onClick={() => handleFilterClick('status', 'pending')}
          className={`group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
            effectiveStatusFilter === 'pending'
              ? 'border-[#3b82f6] shadow-md ring-1 ring-[#3b82f6]/20'
              : 'border-[#dbeafe] hover:border-[#3b82f6]/50 hover:shadow-sm'
          }`}
        >
          <div className="p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg ${
                effectiveStatusFilter === 'pending' ? 'bg-[#dbeafe]' : 'bg-[#dbeafe]/50'
              }`}>
                <Clock className={`h-3.5 w-3.5 ${
                  effectiveStatusFilter === 'pending' ? 'text-[#3b82f6]' : 'text-[#60a5fa]'
                }`} />
              </div>
              <ArrowRight className={`h-2.5 w-2.5 text-gray-300 transition-opacity ${
                effectiveStatusFilter === 'pending' ? 'opacity-100 text-[#3b82f6]' : 'opacity-0 group-hover:opacity-100'
              }`} />
            </div>
            <div>
              <p className="text-[9px] font-medium text-gray-500">Pending</p>
              <p className="text-xl font-bold text-[#0f2a6e] mt-0.5">{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* Pending Approval Card */}
        <div
          onClick={() => handleFilterClick('status', 'pending-approval')}
          className={`group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
            effectiveStatusFilter === 'pending-approval'
              ? 'border-[#3b82f6] shadow-md ring-1 ring-[#3b82f6]/20'
              : 'border-[#dbeafe] hover:border-[#3b82f6]/50 hover:shadow-sm'
          }`}
        >
          <div className="p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg ${
                effectiveStatusFilter === 'pending-approval' ? 'bg-[#dbeafe]' : 'bg-[#dbeafe]/50'
              }`}>
                <AlertCircle className={`h-3.5 w-3.5 ${
                  effectiveStatusFilter === 'pending-approval' ? 'text-[#3b82f6]' : 'text-[#60a5fa]'
                }`} />
              </div>
              <ArrowRight className={`h-2.5 w-2.5 text-gray-300 transition-opacity ${
                effectiveStatusFilter === 'pending-approval' ? 'opacity-100 text-[#3b82f6]' : 'opacity-0 group-hover:opacity-100'
              }`} />
            </div>
            <div>
              <p className="text-[9px] font-medium text-gray-500">Pending Approval</p>
              <p className="text-xl font-bold text-[#0f2a6e] mt-0.5">{stats.approvedPending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue After Complete Grid */}
      {overdueCompletedStats.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-rose-50 bg-gradient-to-r from-rose-50/50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-[#0f2a6e]">Overdue After Complete</h2>
            </div>
            <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Tasks Done Late
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-4 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Late Completions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {overdueCompletedStats.map((stat) => (
                  <tr key={stat.email} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shadow-sm">
                          {stat.avatar ? (
                            <img src={stat.avatar} alt={stat.name} className="h-full w-full object-cover" />
                          ) : (
                            stat.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-900">{stat.name}</span>
                          <span className="text-[10px] text-gray-400">{stat.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-rose-600 bg-rose-50 rounded-full">
                        {stat.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="bg-white rounded-xl border border-[#dbeafe] shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dbeafe] bg-gradient-to-r from-[#dbeafe]/30 to-white">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-[#3b82f6]" />
            <h2 className="text-sm font-semibold text-[#0f2a6e]">Tasks You've Assigned</h2>
            {stats.total > 0 && (
              <span className="text-[9px] font-medium text-[#3b82f6] bg-[#dbeafe] px-1.5 py-0.5 rounded-full">
                {stats.total}
              </span>
            )}
          </div>
        </div>

        <div className="p-3">
          <AllTasksPage
            embedded
            showFiltersInEmbedded
            hideCreateAndBulkActions
            tasks={tasks}
            filter={effectiveStatusFilter}
            setFilter={(value) => handleFilterClick('status', value)}
            dateFilter={effectiveDateFilter}
            setDateFilter={(value) => handleFilterClick('date', value)}
            assignedFilter={'assigned-by-me'}
            hideAssignBy={true}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            currentUser={currentUser}
            users={users}
            onEditTask={async (taskId: string) => {
              const task = tasks.find((t) => t.id === taskId);
              if (task && onEditTask) onEditTask(task);
              return null;
            }}
            onDeleteTask={async () => undefined}
            formatDate={formatDate}
            isOverdue={isOverdue}
            getTaskBorderColor={getTaskBorderColor}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onToggleTaskStatus={onToggleTaskStatus}
            onCreateTask={async () => undefined}
            onReassignTask={async () => undefined}
            onAddTaskHistory={async () => undefined}
            onApproveTask={handleApproveTask}
            onUpdateTaskApproval={handleUpdateTaskApproval}
            onSaveComment={onSaveComment}
            onDeleteComment={onDeleteComment}
            onFetchTaskComments={onFetchTaskComments}
            onFetchTaskHistory={onFetchTaskHistory}
            onBulkCreateTasks={async () => ({ created: [], failures: [] })}
            onMdImpexReassignTask={async () => undefined}
            brands={brands}
            advancedFilters={advancedFilters}
            onAdvancedFilterChange={onAdvancedFilterChange}
            onOpenEditModal={onEditTask ? ((t: Task) => onEditTask(t)) : undefined}
          />
        </div>

        {stats.total === 0 && (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-2 bg-[#dbeafe] rounded-full flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <p className="text-xs text-gray-500">No tasks assigned by you yet</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Tasks you assign to others will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedByMe;