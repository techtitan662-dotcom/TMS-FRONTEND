import { useMemo, useCallback } from 'react';
import type { Task, UserType } from '../Types/Types';

interface UseTaskFilteringProps {
  tasks: Task[];
  users: UserType[];
  currentUser: any;
  filters: any;
  searchTerm: string;
  selectedStatFilter: string;
  canViewAllTasks: boolean;
  isOverdueFn: (dueDate: string, status: string) => boolean;
}

export const useTaskFiltering = ({
  tasks,
  users,
  currentUser,
  filters,
  searchTerm,
  selectedStatFilter,
  canViewAllTasks,
  isOverdueFn
}: UseTaskFilteringProps) => {

  // Utility functions for normalization
  const normalizeText = useCallback((value: unknown): string => {
    return (value == null ? '' : String(value)).trim().toLowerCase();
  }, []);

  const normalizeCompanyKey = useCallback((value: unknown): string => {
    return normalizeText(value).replace(/\s+/g, '');
  }, [normalizeText]);

  // Pre-compute user email to role mapping for faster lookups
  const userRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(user => {
      if (user.email) {
        map.set(user.email.toLowerCase(), (user.role || '').toLowerCase());
      }
    });
    return map;
  }, [users]);

  // Pre-compute user email to user object mapping
  const userMap = useMemo(() => {
    const map = new Map<string, UserType>();
    users.forEach(user => {
      if (user.email) {
        map.set(user.email.toLowerCase(), user);
      }
    });
    return map;
  }, [users]);

  // Memoize role-based filtering logic
  const getRoleFilteredTasks = useCallback((allTasks: Task[]) => {
    if (!currentUser?.email) return [];
    const role = String(currentUser.role || '').trim().toLowerCase();
    const myEmail = currentUser.email.toLowerCase();

    if (canViewAllTasks || ['admin', 'super_admin', 'rm', 'am', 'ar'].includes(role)) {
      return allTasks;
    }

    return allTasks.filter(task => {
      const assignedTo = String(task.assignedTo || '').toLowerCase();
      const assignedBy = String(task.assignedBy || '').toLowerCase();

      switch (role) {
        case 'ob_manager':
          return assignedBy === myEmail || assignedTo === myEmail ||
                 isAssistantAssignee(task, userRoleMap);
        case 'manager':
        case 'marketer_manager':
          if (String(task.taskType || '').toLowerCase() === 'other work') return false;
          return assignedBy === myEmail || assignedTo === myEmail;
        case 'sbm':
          return isTaskInSbmScope(task, currentUser);
        default:
          return assignedTo === myEmail || assignedBy === myEmail;
      }
    });
  }, [currentUser, canViewAllTasks, userRoleMap, userMap, filters, users]);

  // Memoize status filtering
  const getStatusFilteredTasks = useCallback((roleFilteredTasks: Task[]) => {
    if (selectedStatFilter === 'all') return roleFilteredTasks;

    return roleFilteredTasks.filter(task => {
      switch (selectedStatFilter) {
        case 'completed':
          return task.status === 'completed';
        case 'pending':
          return ['pending', 'in-progress', 'reassigned'].includes(task.status);
        case 'overdue':
          return task.status !== 'completed' && isOverdueFn(task.dueDate, task.status);
        default:
          return true;
      }
    });
  }, [selectedStatFilter, isOverdueFn]);

  // Memoize property-based filtering
  const getPropertyFilteredTasks = useCallback((statusFilteredTasks: Task[]) => {
    return statusFilteredTasks.filter(task => {
      // Status filter
      if (filters.status !== 'all') {
        const statusMatch = filters.status === 'pending'
          ? ['pending', 'in-progress', 'reassigned'].includes(task.status)
          : task.status === filters.status;
        if (!statusMatch) return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // Task type filter
      if (filters.taskType !== 'all') {
        const taskTypeKey = String(task.taskType || '').toLowerCase();
        const filterTypeKey = filters.taskType.toLowerCase();
        if (taskTypeKey !== filterTypeKey) return false;
      }

      // Company filter
      if (filters.company !== 'all') {
        const filterCompanyKey = normalizeCompanyKey(filters.company);
        const taskCompany = String(task.companyName || '').toLowerCase();
        if (normalizeCompanyKey(taskCompany) !== filterCompanyKey) return false;
      }

      // Brand filter
      if (filters.brand !== 'all') {
        const taskBrand = String(task.brand || '').toLowerCase();
        const filterBrand = filters.brand.toLowerCase();
        if (taskBrand !== filterBrand) return false;
      }

      // Date filters
      if (filters.date) {
        const taskDate = new Date(task.dueDate);
        const today = new Date();

        switch (filters.date) {
          case 'today':
            if (taskDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            if (taskDate < today || taskDate > nextWeek) return false;
            break;
          case 'overdue':
            if (!isOverdueFn(task.dueDate, task.status)) return false;
            break;
        }
      }

      // Assigned filter
      if (filters.assigned) {
        const assignedFilter = filters.assigned;
        if (assignedFilter === 'assigned-to-me') {
          if (String(task.assignedTo || '').toLowerCase() !== currentUser?.email?.toLowerCase()) return false;
        } else if (assignedFilter === 'assigned-by-me') {
          if (String(task.assignedBy || '').toLowerCase() !== currentUser?.email?.toLowerCase()) return false;
        } else if (assignedFilter.startsWith('assigned-to:')) {
          const assignedToEmail = assignedFilter.split(':')[1];
          if (String(task.assignedTo || '').toLowerCase() !== assignedToEmail.toLowerCase()) return false;
        }
      }

      return true;
    });
  }, [filters, isOverdueFn, currentUser]);

  // Memoize search filtering
  const getSearchFilteredTasks = useCallback((propertyFilteredTasks: Task[]) => {
    if (!searchTerm?.trim()) return propertyFilteredTasks;

    const term = searchTerm.toLowerCase().trim();
    return propertyFilteredTasks.filter(task => {
      const searchableFields = [
        task.title,
        task.companyName,
        task.brand,
        task.taskType,
        task.assignedTo,
        task.assignedBy,
        task.assignedToUser?.email,
        task.assignedToUser?.name,
        task.assignedByUser?.email,
        task.assignedByUser?.name
      ].filter(Boolean).map(field => String(field).toLowerCase());

      return searchableFields.some(field => field.includes(term));
    });
  }, [searchTerm]);

  // Main filtering pipeline
  const filteredTasks = useMemo(() => {
    const roleFiltered = getRoleFilteredTasks(tasks);
    const statusFiltered = getStatusFilteredTasks(roleFiltered);
    const propertyFiltered = getPropertyFilteredTasks(statusFiltered);
    const searchFiltered = getSearchFilteredTasks(propertyFiltered);
    return searchFiltered;
  }, [
    tasks,
    getRoleFilteredTasks,
    getStatusFilteredTasks,
    getPropertyFilteredTasks,
    getSearchFilteredTasks
  ]);

  return filteredTasks;
};

// Helper functions
function isAssistantAssignee(task: Task, userRoleMap: Map<string, string>): boolean {
  const assignedTo = String(task.assignedTo || '').toLowerCase();
  const role = userRoleMap.get(assignedTo);
  return role ? ['assistant', 'assistance', 'sub_assistance'].some(r => role.includes(r)) : false;
}

function isTaskInSbmScope(task: Task, currentUser: any): boolean {
  // Simplified SBM scope checking - this would need to be implemented based on your business logic
  const assignedTo = String(task.assignedTo || '').toLowerCase();
  const assignedBy = String(task.assignedBy || '').toLowerCase();
  const myEmail = currentUser?.email?.toLowerCase();

  // Basic implementation - you may need to expand this based on your SBM logic
  return assignedTo === myEmail || assignedBy === myEmail;
}