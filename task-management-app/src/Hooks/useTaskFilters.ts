import { useMemo, useCallback } from 'react';
import type { Task, FilterState } from '../Types/Types';

export interface UseTaskFiltersProps {
    tasks: Task[];
    filters: FilterState;
    searchTerm: string;
    currentUserEmail: string;
    currentUserRole: string;
    isOverdue?: (dueDate: string, status: string) => boolean;
    applyRoleVisibility?: boolean;
}

export const useTaskFilters = ({
    tasks,
    filters,
    searchTerm,
    currentUserEmail,
    currentUserRole,
    isOverdue,
    applyRoleVisibility = true
}: UseTaskFiltersProps) => {
    const normalizeText = useCallback((value: unknown): string => {
        return (value == null ? '' : String(value)).trim().toLowerCase();
    }, []);

    const normalizeRoleKey = useCallback((value: unknown): string => {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
    }, []);

    const normalizeCompanyKey = useCallback((value: unknown): string => {
        return normalizeText(value).replace(/\s+/g, '');
    }, [normalizeText]);

    const canonicalizeTaskType = useCallback((value: unknown): string => {

        const raw = (value == null ? '' : String(value)).trim();

        if (!raw) return '';

        const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();

        if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') {

            return 'Troubleshoot';

        }

        return raw;

    }, []);

    const isTaskAssignee = useCallback((task: Task) => {
        const myEmail = normalizeText(currentUserEmail);
        const assignedTo = (task as any).assignedToUser?.email || 
                         (typeof task.assignedTo === 'string' ? task.assignedTo : (task.assignedTo as any)?.email) || 
                         '';
        return normalizeText(assignedTo) === myEmail;
    }, [currentUserEmail, normalizeText]);

    const isTaskAssigner = useCallback((task: Task) => {
        const myEmail = normalizeText(currentUserEmail);
        const assignedBy = (task as any).assignedByUser?.email || 
                         (typeof task.assignedBy === 'string' ? task.assignedBy : (task.assignedBy as any)?.email) || 
                         '';
        return normalizeText(assignedBy) === myEmail;
    }, [currentUserEmail, normalizeText]);

    const filteredTasks = useMemo(() => {
        const myEmail = normalizeText(currentUserEmail);
        const roleKey = normalizeRoleKey(currentUserRole);

        return tasks.filter((task) => {
            // Role-based visibility
            if (applyRoleVisibility && roleKey === 'ob_manager') {
                const assignedToEmail = normalizeText(
                    (task as any)?.assignedToUser?.email ||
                    (typeof (task as any)?.assignedTo === 'string' ? (task as any)?.assignedTo : (task as any)?.assignedTo?.email) ||
                    ''
                );
                const isAssignedToMe = Boolean(myEmail && assignedToEmail && assignedToEmail === myEmail);
                
                const assigneeRole = normalizeRoleKey((task as any)?.assignedToUser?.role || '');
                const isAssistantAssignee = ['assistant', 'assistance', 'sub_assistance'].some(r => assigneeRole.includes(r));

                if (!isAssignedToMe && !isAssistantAssignee) return false;
            }

            // Assigned Filter
            if (filters.assigned !== 'all') {
                if (filters.assigned === 'assigned-to-me' && !isTaskAssignee(task)) return false;
                if (filters.assigned === 'assigned-by-me' && !isTaskAssigner(task)) return false;
            }

            // Status Filter
            if (filters.status !== 'all') {
                const fStatus = filters.status.toLowerCase();
                const tStatus = String(task.status || '').toLowerCase();
                if (fStatus === 'completed' && tStatus !== 'completed') return false;
                if (fStatus === 'pending' && tStatus !== 'pending') return false;
                if (fStatus === 'reassigned' && tStatus !== 'reassigned') return false;
            }

            // Priority Filter
            if (filters.priority !== 'all') {
                if (normalizeText(task.priority) !== normalizeText(filters.priority)) return false;
            }

            // Type Filter
            if (filters.taskType !== 'all') {
                const filterType = canonicalizeTaskType(filters.taskType);
                const taskType = canonicalizeTaskType((task as any).taskType || task.type);

                if (!filterType || !taskType) return false;

                if (normalizeText(taskType) !== normalizeText(filterType)) return false;
            }

            // Company Filter
            if (filters.company !== 'all') {
                const fCompany = normalizeCompanyKey(filters.company);
                const tCompany = normalizeCompanyKey((task as any).companyName || task.company);
                if (tCompany !== fCompany) return false;
            }

            // Brand Filter
            if (filters.brand !== 'all') {
                if (normalizeText(task.brand) !== normalizeText(filters.brand)) return false;
            }

            // Search Filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesTitle = task.title?.toLowerCase().includes(searchLower);
                const matchesType = (task as any).taskType?.toLowerCase().includes(searchLower) || task.type?.toLowerCase().includes(searchLower);
                const matchesBrand = task.brand?.toLowerCase().includes(searchLower);
                if (!matchesTitle && !matchesType && !matchesBrand) return false;
            }

            // Date Filter
            if (filters.date && filters.date !== 'all') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const taskDate = new Date(task.dueDate);
                taskDate.setHours(0, 0, 0, 0);

                if (filters.date === 'today') {
                    if (taskDate.getTime() !== today.getTime()) return false;
                }

                if (filters.date === 'week') {
                    const weekFromNow = new Date(today);
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    if (taskDate > weekFromNow || taskDate < today) return false;
                }

                if (filters.date === 'overdue') {
                    if (typeof isOverdue !== 'function') return false;
                    const overdue = isOverdue(task.dueDate, task.status);
                    if (!overdue) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            const aDate = new Date(a.createdAt || 0).getTime();
            const bDate = new Date(b.createdAt || 0).getTime();
            return filters.sort === 'asc' ? aDate - bDate : bDate - aDate;
        });
    }, [tasks, filters, searchTerm, currentUserEmail, currentUserRole, isOverdue, applyRoleVisibility, isTaskAssignee, isTaskAssigner, canonicalizeTaskType, normalizeText, normalizeRoleKey, normalizeCompanyKey]);

    return { filteredTasks };
};
