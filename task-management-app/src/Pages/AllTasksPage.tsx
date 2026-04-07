import {
  X,
  Send,
  User,
  Clock,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  History,
  UserPlus,
  Check,
  CheckCircle,
  Plus,
  Edit,
  Loader2,
  MessageSquare,
  Trash2,
  RefreshCcw,
  Upload,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Building,
  Layers,
  FileClock,
  Tag,
} from 'lucide-react';

import type { Task, UserType, CommentType, TaskHistory, Brand } from '../Types/Types';
import toast from 'react-hot-toast';
import type * as React from 'react';
import { useMemo, useCallback, useState, useEffect, useRef, memo } from 'react';
import { taskTypeService, type TaskTypeItem } from '../Services/TaskType.service';
import mdImpexAccessService from '../Services/MdImpexAccess.services';
import { companyTaskTypeService } from '../Services/CompanyTaskType.service';
import { companyService } from '../Services/Company.service';
import { assignService } from '../Services/Assign.service';
import { TasksPageSkeleton } from '../Components/LoadingSkeletons';
import AdvancedFiltersPanel from './AdvancedFilters';

const SPEED_E_COM_COMPANY_KEY = 'speed e com';
const SPEED_E_COM_FIXED_TASK_TYPES = ['Meeting Pending', 'CP Pending', 'Recharge Negative'];
const MD_IMPEX_COMPANY_NAME = 'MD Impex';

const DEFAULT_TASKS_PER_PAGE = 20;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200];

// ==================== TYPES ====================
interface AllTasksPageProps {
  tasks: Task[];
  filter: string;
  setFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  assignedFilter: string;
  setAssignedFilter?: (filter: string) => void;
  onResetFilters?: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: UserType;
  users: UserType[];
  onEditTask: (taskId: string, updatedTask: Partial<Task>) => Promise<Task | null>;
  onDeleteTask: (taskId: string) => Promise<void>;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onToggleTaskStatus: (taskId: string, currentStatus: Task['status'], doneByAdmin?: boolean) => Promise<void>;
  onCreateTask: () => Promise<Task | void>;
  onSaveComment?: (taskId: string, content: string) => Promise<CommentType>;
  onDeleteComment?: (taskId: string, commentId: string) => Promise<void>;
  onFetchTaskComments?: (taskId: string) => Promise<CommentType[]>;
  onReassignTask?: (taskId: string, newAssigneeId: string, dueDate?: string) => Promise<void>;
  onAddTaskHistory?: (taskId: string, history: Omit<TaskHistory, 'id' | 'timestamp'>, additionalData?: Record<string, any>) => Promise<void>;
  onApproveTask?: (taskId: string, approve: boolean) => Promise<void>;
  onUpdateTaskApproval?: (taskId: string, completedApproval: boolean) => Promise<void>;
  onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
  onBulkCreateTasks?: (tasks: BulkTaskPayload[]) => Promise<BulkCreateResult>;
  onMdImpexReassignTask?: (taskId: string, newAssigneeEmail: string) => Promise<void>;
  // Optional sidebar collapsed state from DashboardPage
  isSidebarCollapsed?: boolean;
  brands: Brand[];

  embedded?: boolean;
  showFiltersInEmbedded?: boolean;
  hideCreateAndBulkActions?: boolean;
  hideAssignBy?: boolean;

  // NEW PROPS FOR INTEGRATION
  advancedFilters?: AdvancedFilters;
  onAdvancedFilterChange?: (filterType: string, value: string) => void;
  showEditModal?: boolean;
  editingTask?: Task | null;
  onOpenEditModal?: (task: Task) => void;
  onCloseEditModal?: () => void;
  onSaveEditedTask?: () => Promise<void>;
  getBrandsByCompany?: (companyName: string) => string[];
}

type BulkPriority = 'low' | 'medium' | 'high' | 'urgent';

interface BulkTaskPayload {
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: BulkPriority;
  taskType?: string;
  companyName?: string;
  brand?: string;
  rowNumber: number;
}

interface BulkCreateFailure {
  index: number;
  rowNumber: number;
  title: string;
  reason: string;
}

interface BulkCreateResult {
  created: Task[];
  failures: BulkCreateFailure[];
}

interface BulkImportDefaults {
  assigner: string;
  dueDate: string;
  priority: BulkPriority;
  taskType: string;
  companyName: string;
  brand: string;
}

interface BulkTaskDraft {
  id: string;
  rowNumber: number;
  title: string;
  assigner: string;
  dueDate: string;
  priority: BulkPriority | '';
  taskType: string;
  companyName: string;
  brand: string;
  errors: string[];
}

interface AdvancedFilters {
  status: string;
  priority: string;
  assigned: string;
  date: string;
  taskType: string;
  company: string;
  brand: string;
  rm: string;
  rmTeam?: string;
}

function parseMultiValue(value: string): string[] {
  const raw = (value || '').toString().trim();
  if (!raw || raw === 'all') return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

interface HistoryDisplayItem {
  id: string;
  type: 'history' | 'comment';
  data: TaskHistory | CommentType;
  timestamp: string;
  displayTime: string;
  actionType: string;
  color: string;
  icon: React.ReactNode;
  label: string;
}

interface MobileTaskItemProps {
  task: Task;
  isToggling: boolean;
  isDeleting: boolean;
  isApproving: boolean;
  isUpdatingApproval: boolean;
  openMenuId: string | null;
  currentUser: UserType;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  getTaskStatusIcon: (taskId: string, isCompleted: boolean) => React.ReactNode;
  getUserInfoForDisplay: (task: Task) => { name: string; email: string };
  brandLabel?: string;
  onToggleStatus: (taskId: string, originalTask: Task) => Promise<void>;
  onOpenCommentSidebar: (task: Task) => Promise<void>;
  onOpenReassignModal: (task: Task) => void;
  onOpenApprovalModal: (task: Task, action: 'approve' | 'reject') => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSetOpenMenuId: (id: string | null) => void;
  isTaskAssignee: (task: Task) => boolean;
  isTaskAssigner: (task: Task) => boolean;
  isTaskCompleted: (taskId: string) => boolean;
  isTaskPermanentlyApproved: (taskId: string) => boolean;
  isTaskPendingApproval: (taskId: string) => boolean;
  onOpenHistoryModal: (task: Task) => Promise<void>;
  showAssignButton: boolean;
  onAssignClick: (task: Task) => void;
  disableStatusToggle?: boolean;
  showDeleteButton?: boolean;
  hasUnreadComments?: (taskId: string) => boolean;
  canEditTask?: (task: Task) => boolean;
  onEditTaskClick: (task: Task) => void;
  onPermanentApproval: (taskId: string, value: boolean) => Promise<void>;
}

interface DesktopTaskItemProps {
  index: number;
  task: Task;
  isToggling: boolean;
  currentUser: UserType;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  getTaskStatusIcon: (taskId: string, isCompleted: boolean) => React.ReactNode;
  getUserInfoForDisplay: (userId: any) => { name: string; email: string };
  brandLabel?: string;
  brands?: Brand[];
  onToggleStatus: (taskId: string, originalTask: Task) => Promise<void>;
  onEditTaskClick: (task: Task) => void;
  onOpenCommentSidebar: (task: Task) => Promise<void>;
  onOpenHistoryModal: (task: Task) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  isTaskCompleted: (taskId: string) => boolean;
  isTaskPermanentlyApproved: (taskId: string) => boolean;
  isTaskAssignee: (task: Task) => boolean;
  isTaskAssigner: (task: Task) => boolean;
  canEditTask?: (task: Task) => boolean;
  onPermanentApproval: (taskId: string, value: boolean) => Promise<void>;
  isUpdatingApproval: boolean;
  showAssignButton?: boolean;
  onAssignClick?: (task: Task) => void;
  disableStatusToggle?: boolean;
  showDeleteButton?: boolean;
  hasUnreadComments?: (taskId: string) => boolean;
  hideAssignBy?: boolean;
  assignedFilter?: string;
}

interface BulkActionsProps {
  selectedTasks: string[];
  bulkDeleting: boolean;
  onBulkComplete: () => void;
  onBulkPending: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

interface ApprovalModalProps {
  showApprovalModal: boolean;
  taskToApprove: Task | null;
  approvalAction: 'approve' | 'reject';
  approvingTasks: string[];
  onClose: () => void;
  onApprove: (approve: boolean) => Promise<void>;
}

interface ReassignModalProps {
  showReassignModal: boolean;
  reassignTask: Task | null;
  newAssigneeId: string;
  newDueDate: string;
  reassignComment: string;
  reassignLoading: boolean;
  users: UserType[];
  currentUser: UserType;
  onClose: () => void;
  onAssigneeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDueDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReassign: () => Promise<void>;
}

// ==================== CONSTANTS ====================

// History action type constants
const HISTORY_ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  'task_created': { color: 'bg-green-100 text-green-800 border-green-200', icon: <Plus className="h-3 w-3" />, label: 'Task Created' },
  'task_edited': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Task Edited' },
  'task_deleted': { color: 'bg-red-100 text-red-800 border-red-200', icon: <Trash2 className="h-3 w-3" />, label: 'Task Deleted' },
  'marked_completed': { color: 'bg-green-100 text-green-800 border-green-200', icon: <Check className="h-3 w-3" />, label: 'Marked Completed' },
  'marked_pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="h-3 w-3" />, label: 'Marked Pending' },
  'admin_approved': { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <CheckCircle className="h-3 w-3" />, label: 'Admin Approved' },
  'rejected_by_admin': { color: 'bg-red-100 text-red-800 border-red-200', icon: <X className="h-3 w-3" />, label: 'Rejected by Admin' },
  'assigner_permanent_approved': { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <Eye className="h-3 w-3" />, label: 'Permanently Approved' },
  'permanent_approval_removed': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <EyeOff className="h-3 w-3" />, label: 'Permanent Approval Removed' },
  'task_reassigned': { color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: <UserPlus className="h-3 w-3" />, label: 'Task Reassigned' },
  'priority_changed': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Priority Changed' },
  'due_date_changed': { color: 'bg-pink-100 text-pink-800 border-pink-200', icon: <Calendar className="h-3 w-3" />, label: 'Due Date Changed' },
  'status_changed': { color: 'bg-teal-100 text-teal-800 border-teal-200', icon: <RefreshCcw className="h-3 w-3" />, label: 'Status Changed' },
  'comment_added': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <MessageSquare className="h-3 w-3" />, label: 'Comment Added' },
  'comment_deleted': { color: 'bg-red-100 text-red-800 border-red-200', icon: <Trash2 className="h-3 w-3" />, label: 'Comment Deleted' },
  'title_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Title Changed' },
  'type_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Task Type Changed' },
  'company_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Building className="h-3 w-3" />, label: 'Company Changed' },
  'brand_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Layers className="h-3 w-3" />, label: 'Brand Changed' },
  'task_edit_failed': { color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Edit Failed' },
  'bulk_completed': { color: 'bg-green-100 text-green-800 border-green-200', icon: <Check className="h-3 w-3" />, label: 'Bulk Completed' },
  'bulk_pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="h-3 w-3" />, label: 'Bulk Pending' },
  'default': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <History className="h-3 w-3" />, label: 'Activity' }
};

// ==================== UTILITY FUNCTIONS ====================
const formatDateTime = (timestamp: string): string => {
  try {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '—';
  }
};

// ==================== MD IMPEX REASSIGN MODAL ====================
const MdImpexReassignModal = memo(({
  show,
  task,
  users,
  currentUser,
  newAssigneeEmail,
  isSubmitting,
  onClose,
  onAssigneeChange,
  onSubmit,
}: {
  show: boolean;
  task: Task | null;
  users: UserType[];
  currentUser: UserType;
  newAssigneeEmail: string;
  isSubmitting: boolean;
  onClose: () => void;
  onAssigneeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSubmit: () => Promise<void>;
}) => {
  const normalizeText = useCallback((v: unknown) => String(v || '').trim().toLowerCase(), []);
  const normalizeRoleKey = useCallback((v: unknown) => normalizeText(v).replace(/[\s-]+/g, '_'), [normalizeText]);
  const normalizeCompanyKey = useCallback((v: unknown) => normalizeText(v).replace(/\s+/g, ''), [normalizeText]);

  const myRoleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser, normalizeRoleKey]);
  const myCompanyKey = useMemo(
    () => normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company || ''),
    [currentUser, normalizeCompanyKey]
  );
  const taskCompanyKey = useMemo(() => normalizeCompanyKey((task as any)?.companyName || (task as any)?.company || ''), [normalizeCompanyKey, task]);

  const myEmailKey = useMemo(() => normalizeText((currentUser as any)?.email || ''), [currentUser, normalizeText]);
  const isKeyuriUser = useMemo(() => myEmailKey === 'keyurismartbiz@gmail.com', [myEmailKey]);

  const currentAssigneeEmail = useMemo(() => {
    const candidate: any = (task as any)?.assignedToUser || (task as any)?.assignedTo;
    const email =
      (typeof candidate === 'string' && candidate.includes('@') ? candidate : candidate?.email) ||
      '';
    return normalizeText(email);
  }, [normalizeText, task]);

  const canReassign = useMemo(() => {
    if (!task) return false;
    if (taskCompanyKey !== 'mdimpex') return false;
    if (myRoleKey === 'admin' || myRoleKey === 'super_admin') return true;
    // MD Impex: only OB Manager and Keyuri can reassign (legacy behavior)
    if (myRoleKey === 'ob_manager') return true;
    return isKeyuriUser;
  }, [myCompanyKey, myRoleKey, task, taskCompanyKey]);

  const availableUsers = useMemo(() => {
    if (taskCompanyKey !== 'mdimpex') return [];
    const list = Array.isArray(users) ? users : [];
    const mdImpexUsers = list
      .filter((u: any) => normalizeCompanyKey((u as any)?.companyName || (u as any)?.company || '') === 'mdimpex')
      .filter((u: any) => {
        const email = normalizeText(u?.email);
        if (!email) return false;
        // Don't list current assignee (no-op reassignment is blocked by backend anyway)
        if (currentAssigneeEmail && email === currentAssigneeEmail) return false;

        // Assistant: only allow assigning to sub-assistant within MD Impex
        if (myRoleKey === 'assistant') {
          const rk = normalizeRoleKey((u as any)?.role);
          const isSubAssistant = rk === 'sub_assistance'
            || rk === 'sub_assistence'
            || rk === 'sub_assist'
            || rk === 'sub_assistant';
          if (!isSubAssistant) return false;
        }

        // OB Manager: only allow assigning to assistant/sub-assistant within MD Impex
        if (myRoleKey === 'ob_manager') {
          const rk = normalizeRoleKey((u as any)?.role);
          const isAssistantLike = rk === 'assistant'
            || rk === 'assistance'
            || rk === 'sub_assistance'
            || rk === 'sub_assistence'
            || rk === 'sub_assist'
            || rk === 'sub_assistant'
            || rk.includes('assistant');
          if (!isAssistantLike) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => String(a?.email || '').localeCompare(String(b?.email || '')));

    return mdImpexUsers;
  }, [currentAssigneeEmail, myRoleKey, normalizeCompanyKey, normalizeRoleKey, normalizeText, taskCompanyKey, users]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">MD Impex Reassign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!task ? (
            <div className="text-sm text-gray-700">Task not found.</div>
          ) : taskCompanyKey !== 'mdimpex' ? (
            <div className="text-sm text-gray-700">This reassignment flow is only for MD Impex tasks.</div>
          ) : !canReassign ? (
            <div className="text-sm text-red-600">You do not have permission to reassign this MD Impex task.</div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Task</div>
                <div className="text-sm text-gray-900">{(task as any)?.title || '—'}</div>
                <div className="text-xs text-gray-600 mt-1">Current assignee: {currentAssigneeEmail || '—'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reassign to (email)</label>
                <select
                  value={newAssigneeEmail}
                  onChange={onAssigneeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select email</option>
                  {availableUsers.map((u: any) => (
                    <option key={String(u?.id || u?._id || u?.email)} value={normalizeText(u?.email)}>
                      {String(u?.email || '').trim()}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void onSubmit()}
            disabled={isSubmitting || !task || taskCompanyKey !== 'mdimpex' || !canReassign || !newAssigneeEmail}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Reassign
          </button>
        </div>
      </div>
    </div>
  );
});

const getTaskWithDemoData = (task: Task): Task => {
  const rawCompany = (task.companyName || (task as any).company || (task as any).companyName || '').toString();
  const rawBrand = (typeof task.brand === 'string'
    ? task.brand
    : (task.brand as any)?.name || (task as any).brand || ''
  ).toString();
  const rawType = ((task as any).taskType || (task as any).type || '').toString();

  return {
    ...task,
    company: rawCompany.toLowerCase(),
    brand: rawBrand.toLowerCase(),
    type: rawType.toLowerCase(),
  };
};

const validateBulkDraft = (draft: BulkTaskDraft): BulkTaskDraft => {
  const errors: string[] = [];

  if (!draft.title.trim()) {
    errors.push('Title is required');
  }

  if (!draft.assigner.trim()) {
    errors.push('Assigner email is required');
  } else if (!draft.assigner.includes('@')) {
    errors.push('Invalid email format for assigner');
  }

  if (!draft.dueDate) {
    errors.push('Due date is required');
  } else {
    const dueDateObj = new Date(draft.dueDate);
    if (isNaN(dueDateObj.getTime())) {
      errors.push('Invalid due date format');
    }
  }

  return {
    ...draft,
    errors
  };
};

// ==================== BULK ACTIONS COMPONENT ====================
const BulkActions = memo(({
  selectedTasks,
  bulkDeleting,
  onBulkComplete,
  onBulkPending,
  onBulkDelete,
  onClearSelection
}: BulkActionsProps) => {
  if (selectedTasks.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear selection
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBulkComplete}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium flex items-center gap-2"
          >
            <Check className="h-3.5 w-3.5" />
            Mark as Completed
          </button>
          <button
            onClick={onBulkPending}
            className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg font-medium flex items-center gap-2"
          >
            <Clock className="h-3.5 w-3.5" />
            Mark as Pending
          </button>
          <button
            onClick={onBulkDelete}
            disabled={bulkDeleting}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {bulkDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      </div>
    </div>
  );
});

BulkActions.displayName = 'BulkActions';

// ==================== BULK IMPORTER COMPONENT ===================
const BulkImporter = memo(({
  draftTasks = [],
  defaults,
  currentUser,
  users = [],
  companyBrandMap,
  availableTaskTypes,
  onDefaultsChange,
  onDraftsChange,
  onClose,
  onSubmit,
  submitting = false,
  summary = null,
  getBrandsByCompany
}: {
  draftTasks?: BulkTaskDraft[];
  defaults: BulkImportDefaults;
  currentUser?: UserType;
  users?: UserType[];
  companyBrandMap: Record<string, string[]>;
  availableTaskTypes: string[];
  onDefaultsChange: (defaults: Partial<BulkImportDefaults>) => void;
  onDraftsChange: (drafts: BulkTaskDraft[]) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting?: boolean;
  summary?: BulkCreateResult | null;
  getBrandsByCompany?: (companyName: string) => string[];
  show?: boolean;
  setShow?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [bulkTaskInput, setBulkTaskInput] = useState<string>('');

  const isMdImpexUser = useMemo(() => {
    const roleKey = String((currentUser as any)?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (roleKey === 'marketer_manager') return true;
    const normalizeCompanyKeyLocal = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
    const myKey = normalizeCompanyKeyLocal((currentUser as any)?.companyName || (currentUser as any)?.company || '');
    const mdKey = normalizeCompanyKeyLocal(MD_IMPEX_COMPANY_NAME);
    return Boolean(myKey && mdKey && myKey === mdKey);
  }, [currentUser]);

  const canonicalizeTaskTypeLabel = useCallback((value: unknown): string => {
    const raw = (value == null ? '' : String(value)).trim();
    if (!raw) return '';
    const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
    if (key === 'troubleshoot') return 'Troubleshoot';
    return raw;
  }, []);

  const assignerUsers = useMemo(() => {
    const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const normalizeCompany = (v: unknown) => String(v || '').trim().toLowerCase();
    const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();
    const toId = (u: any) => String(u?.id || u?._id || '').trim();

    const role = normalizeRole((currentUser as any)?.role);
    const baseUsers = Array.isArray(users) ? users : [];

    if (role === 'troubleshoot_manager') {
      const allowedEmails = [
        'drashtismartbiz@gmail.com',
        'harshsmartbiz@gmail.com',
        'krunalsmartbiz@gmail.com',
        'nitishnilaya@gmail.com',
        'meetsmartbiz@gmail.com'
      ].map((e) => String(e).trim().toLowerCase());

      const allowedSet = new Set(allowedEmails);
      const allowedUsers = allowedEmails.map((email) => {
        const found = baseUsers.find((u: any) => normalizeEmail(u?.email) === email);
        if (found) return found;
        return {
          id: email,
          name: email.split('@')[0] || 'User',
          email,
          role: 'user'
        } as any;
      });

      return Array.from(
        new Map(
          allowedUsers
            .filter((u: any) => allowedSet.has(normalizeEmail(u?.email)))
            .map((u: any) => [normalizeEmail(u?.email) || toId(u), u])
        ).values()
      );
    }

    const modalCompanyKey = normalizeCompany(defaults.companyName);
    const userCompanyKey = normalizeCompany((currentUser as any)?.companyName || (currentUser as any)?.company);
    const targetCompanyKey = (() => {
      if (role === 'admin' || role === 'super_admin') return modalCompanyKey;
      return modalCompanyKey || userCompanyKey;
    })();

    const filterByCompany = (list: any[]) => {
      if (!targetCompanyKey) {
        if (role === 'admin' || role === 'super_admin') return list;
        return list.filter((u: any) => normalizeCompany(u?.companyName || u?.company) === userCompanyKey);
      }
      return list.filter((u: any) => normalizeCompany(u?.companyName || u?.company) === targetCompanyKey);
    };

    // For MD Manager bulk import: allow assigning to Managers/OB Managers in company + all MD Managers, including self.
    if (role === 'md_manager' || isMdImpexUser) {
      const requesterId = toId(currentUser);
      const myEmail = normalizeEmail((currentUser as any)?.email);

      const selfUser = baseUsers.find((u: any) => {
        const id = toId(u);
        const email = normalizeEmail(u?.email);
        return (requesterId && id === requesterId) || (myEmail && email === myEmail);
      }) || (currentUser as any);

      // If it's an MD Impex user, show all MD Impex members
      if (isMdImpexUser) {
        const mdImpexMembers = baseUsers.filter(u => {
          const comp = String(u?.companyName || u?.company || '').trim().toLowerCase();
          const target = MD_IMPEX_COMPANY_NAME.toLowerCase();
          return comp === target || comp === target.replace(/\s+/g, '');
        });
        const candidates = [...mdImpexMembers, selfUser]
          .filter((u: any) => Boolean(String(u?.email || '').trim()));
        return Array.from(new Map(candidates.map((u: any) => [toId(u) || normalizeEmail(u?.email) || String(u?.email || ''), u])).values());
      }

      const mdManagers = baseUsers.filter((u: any) => normalizeRole(u?.role) === 'md_manager');
      const managersAndObManagers = filterByCompany(baseUsers.filter((u: any) => {
        const r = normalizeRole(u?.role);
        return r === 'manager' || r === 'ob_manager';
      }));

      const candidates = [...mdManagers, selfUser, ...managersAndObManagers]
        .filter((u: any) => Boolean(String(u?.email || '').trim()));

      return Array.from(new Map(candidates.map((u: any) => [toId(u) || normalizeEmail(u?.email) || String(u?.email || ''), u])).values());
    }

    // Speed E Com roles: SBM should see RM/AM + Admin/SuperAdmin + self (company-scoped)
    if (role === 'sbm') {
      const requesterId = toId(currentUser);
      const myEmail = normalizeEmail((currentUser as any)?.email);

      const selfUser = baseUsers.find((u: any) => {
        const id = toId(u);
        const email = normalizeEmail(u?.email);
        return (requesterId && id === requesterId) || (myEmail && email === myEmail);
      }) || (currentUser as any);

      const adminUsers = baseUsers.filter((u: any) => {
        const r = normalizeRole(u?.role);
        return r === 'admin' || r === 'super_admin';
      });

      const rmAmUsers = filterByCompany(baseUsers.filter((u: any) => {
        const r = normalizeRole(u?.role);
        return r === 'rm' || r === 'am' || r === 'ar';
      }));

      const candidates = [...adminUsers, selfUser, ...rmAmUsers]
        .filter((u: any) => Boolean(String(u?.email || '').trim()));

      return Array.from(new Map(candidates.map((u: any) => [toId(u) || normalizeEmail(u?.email) || String(u?.email || ''), u])).values());
    }

    // Default behavior: use provided list as-is (it is usually already role-scoped by parent)
    const finalUsers = (baseUsers || []).filter((u: any) => Boolean(String(u?.email || '').trim()));

    if (role === 'marketer_manager') {
      const mdImpexMembers = finalUsers.filter(u => {
        const comp = String(u?.companyName || u?.company || '').trim().toLowerCase().replace(/\s+/g, '');
        return comp === 'mdimpex';
      });
      return mdImpexMembers.length > 0 ? mdImpexMembers : finalUsers;
    }

    return finalUsers;
  }, [currentUser, defaults.companyName, users]);

  // MD Impex specific allowed lists (fetched from access service)
  const [mdAllowedMembers, setMdAllowedMembers] = useState<UserType[]>([]);
  const [mdAllowedTaskTypes, setMdAllowedTaskTypes] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchMdAccess = async () => {
      try {
        if (!isMdImpexUser || !(currentUser as any)?.email) return;

        const [membersRes, accessRes] = await Promise.all([
          mdImpexAccessService.getAllMembers(),
          mdImpexAccessService.getAllPersonAccess(),
        ]);

        if (!mounted) return;

        if (membersRes.success && membersRes.data) {
          const allMembers = (membersRes.data || []).map((m: any) => ({
            id: String(m.id || m._id || ''),
            email: String(m.email || '').trim(),
            name: String(m.name || '').trim(),
            role: String(m.role || '').trim(),
          }));

          const currentNormalized = String((currentUser as any)?.email || '').trim().toLowerCase();
          const accessList = (accessRes.success && accessRes.data) ? accessRes.data : [];
          const myAccess = accessList.find((item: any) => String(item.assignedToEmail || '').trim().toLowerCase() === currentNormalized);

          const myInfo = allMembers.find((m: any) => String(m.email || '').trim().toLowerCase() === currentNormalized) as any;
          const myRoleNormalized = String(myInfo?.role || '').trim().toLowerCase().replace(/\s+/g, '_');
          const isAdmin = ['admin', 'super_admin', 'troubleshoot_manager'].includes(String((currentUser as any)?.role || '').trim().toLowerCase());

          if (!defaults.companyName) {
            onDefaultsChange({ companyName: MD_IMPEX_COMPANY_NAME });
          }

          if (myRoleNormalized === 'md_manager' || isAdmin) {
            let members: any[] = [];
            if (myAccess && myAccess.allowedAssignees && myAccess.allowedAssignees.length > 0) {
              const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
              members = allMembers.filter((m: any) => allowedIds.has(String(m.id)) || String(m.email || '').trim().toLowerCase() === currentNormalized);
            } else {
              members = allMembers;
            }

            setMdAllowedMembers(members.map((m: any) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'user' })));
            setMdAllowedTaskTypes(myAccess?.allowedTaskTypes || []);

            if (!defaults.assigner && members.length > 0) {
              onDefaultsChange({ assigner: members[0].email });
            }
          } else if (myAccess) {
            const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
            const filteredMembers = allMembers.filter((m: any) => allowedIds.has(String(m.id)) || String(m.email || '').trim().toLowerCase() === currentNormalized);
            const members = filteredMembers.map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
            setMdAllowedMembers(members.map((m: any) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'user' })));
            setMdAllowedTaskTypes(myAccess.allowedTaskTypes || []);

            if (!defaults.assigner && members.length > 0) {
              onDefaultsChange({ assigner: members[0].email });
            }
          } else {
            // No specific access — only self
            const me = allMembers.filter((m: any) => String(m.email || '').trim().toLowerCase() === currentNormalized).map((m: any) => ({ id: m.id, email: m.email, name: m.name }));
            setMdAllowedMembers(me.map((m: any) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'user' })));
            setMdAllowedTaskTypes([]);
            if (!defaults.assigner && me.length > 0) {
              onDefaultsChange({ assigner: me[0].email });
            }
          }
        }
      } catch (err) {
        console.error('❌ [BulkImporter] MD Impex access fetch error:', err);
      }
    };

    void fetchMdAccess();
    return () => { mounted = false; };
  }, [currentUser, defaults.assigner, isMdImpexUser, onDefaultsChange]);

  const effectiveAssignerUsers = useMemo(() => {
    if (isMdImpexUser && mdAllowedMembers && mdAllowedMembers.length > 0) return mdAllowedMembers;
    return assignerUsers;
  }, [isMdImpexUser, mdAllowedMembers, assignerUsers]);

  const effectiveAvailableTaskTypes = useMemo(() => {
    if (isMdImpexUser && mdAllowedTaskTypes && mdAllowedTaskTypes.length > 0) return mdAllowedTaskTypes;
    return availableTaskTypes || [];
  }, [isMdImpexUser, mdAllowedTaskTypes, availableTaskTypes]);

  const availableCompanyOptions = useMemo(() => {
    const role = String((currentUser as any)?.role || '').trim().toLowerCase();
    const keys = Object.keys(companyBrandMap || {});
    if (isMdImpexUser || role === 'troubleshoot_manager') {
      const match = keys.find((k) => String(k).trim().toLowerCase() === 'md impex');
      return [match || MD_IMPEX_COMPANY_NAME];
    }
    if (role === 'sbm' || role === 'rm' || role === 'am') {
      const preferred = String(defaults.companyName || '').trim();
      if (preferred) return keys.filter((k) => String(k).trim() === preferred);
      const userCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase().replace(/\s+/g, '');
      const match = keys.find((k) => String(k).trim().toLowerCase().replace(/\s+/g, '') === userCompany);
      if (match) return [match];
      return keys.slice(0, 1);
    }
    return keys;
  }, [companyBrandMap, currentUser, defaults.companyName, isMdImpexUser]);

  const effectiveCompanyName = useMemo(() => {
    const raw = String(defaults.companyName || '').trim();
    if (!raw) return '';
    const keys = Object.keys(companyBrandMap || {});
    const match = keys.find((k) => String(k).trim().toLowerCase() === raw.toLowerCase());
    if (match) return match;
    const optMatch = (availableCompanyOptions || []).find((opt) => String(opt || '').trim().toLowerCase() === raw.toLowerCase());
    return String(optMatch || raw).trim();
  }, [availableCompanyOptions, companyBrandMap, defaults.companyName]);

  const companySelectValue = useMemo(() => {
    const raw = String(defaults.companyName || '').trim();
    if (!raw) return '';
    const match = (availableCompanyOptions || []).find((opt) => String(opt || '').trim().toLowerCase() === raw.toLowerCase());
    if (match) return match;
    const match2 = (availableCompanyOptions || []).find((opt) => String(opt || '').trim().toLowerCase() === effectiveCompanyName.toLowerCase());
    return String(match2 || effectiveCompanyName || raw).trim();
  }, [availableCompanyOptions, defaults.companyName, effectiveCompanyName]);

  // Get today's date in YYYY-MM-DD format
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }, []);

  // Filter brands based on selected company
  const filteredBrands = useMemo(() => {
    if (!effectiveCompanyName || effectiveCompanyName === 'all') {
      // Return all unique brands when no company or "all" selected
      if (getBrandsByCompany) {
        return getBrandsByCompany('all');
      }
      const allBrands = Object.values(companyBrandMap).flat();
      return [...new Set(allBrands)];
    }
    return companyBrandMap[effectiveCompanyName] || [];
  }, [companyBrandMap, effectiveCompanyName, getBrandsByCompany]);

  const handleFieldChange = useCallback((id: string, field: keyof BulkTaskDraft, value: string) => {
    onDraftsChange(draftTasks.map(task =>
      task.id === id ? { ...task, [field]: value, errors: [] } : task
    ));
  }, [draftTasks, onDraftsChange]);

  const handleRemoveDraft = useCallback((id: string) => {
    onDraftsChange(draftTasks.filter(task => task.id !== id));
  }, [draftTasks, onDraftsChange]);

  const handleParseBulkInput = useCallback(() => {
    if (!bulkTaskInput.trim()) {
      toast.error('Please enter task titles');
      return;
    }

    // Validate due date if provided
    if (defaults.dueDate && defaults.dueDate < today) {
      toast.error('Due date cannot be in the past');
      return;
    }

    const taskTitles = bulkTaskInput.trim().split('\n')
      .map(title => title.trim())
      .filter(title => title.length > 0);

    if (taskTitles.length === 0) {
      toast.error('No valid tasks found');
      return;
    }

    const newDrafts: BulkTaskDraft[] = taskTitles.map((title, index) => {
      const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
      const errors: string[] = [];

      if (!title.trim()) {
        errors.push('Task title is required');
      }

      // Validate due date for each task
      if (defaults.dueDate && defaults.dueDate < today) {
        errors.push('Due date cannot be in the past');
      }

      return {
        id: draftId,
        rowNumber: draftTasks.length + index + 1,
        title,
        assigner: defaults.assigner,
        dueDate: defaults.dueDate,
        priority: defaults.priority,
        taskType: defaults.taskType,
        companyName: effectiveCompanyName || defaults.companyName,
        brand: defaults.brand,
        errors
      };
    });

    // Add new tasks at the TOP of existing tasks
    onDraftsChange([...newDrafts, ...draftTasks]);
    setBulkTaskInput('');
    toast.success(` ${taskTitles.length} tasks added successfully`);
  }, [bulkTaskInput, defaults, draftTasks, effectiveCompanyName, onDraftsChange, today]);

  // Handle company change - reset brand when company changes
  const handleCompanyChange = useCallback((companyName: string) => {
    const role = String((currentUser as any)?.role || '').trim().toLowerCase();
    if (isMdImpexUser || role === 'troubleshoot_manager') return;
    onDefaultsChange({
      companyName: companyName,
      brand: '' // Reset brand when company changes
    });
  }, [currentUser, isMdImpexUser, onDefaultsChange]);

  // Apply default assigner to all tasks
  const handleApplyAssignerToAll = useCallback(() => {
    if (!defaults.assigner) {
      toast.error('Please select an assigner first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      assigner: defaults.assigner
    })));

    toast.success(`Assigner applied to all ${draftTasks.length} tasks`);
  }, [defaults.assigner, draftTasks, onDraftsChange]);

  // Apply default company to all tasks
  const handleApplyCompanyToAll = useCallback(() => {
    if (!defaults.companyName) {
      toast.error('Please select a company first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      companyName: defaults.companyName
    })));

    toast.success(` Company applied to all ${draftTasks.length} tasks`);
  }, [defaults.companyName, draftTasks, onDraftsChange]);

  // Apply default brand to all tasks
  const handleApplyBrandToAll = useCallback(() => {
    if (!defaults.brand) {
      toast.error('Please select a brand first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      brand: defaults.brand
    })));

    toast.success(` Brand applied to all ${draftTasks.length} tasks`);
  }, [defaults.brand, draftTasks, onDraftsChange]);

  // Apply default due date to all tasks
  const handleApplyDueDateToAll = useCallback(() => {
    if (!defaults.dueDate) {
      toast.error('Please select a due date first');
      return;
    }

    // Validate due date is not in past
    if (defaults.dueDate < today) {
      toast.error('Due date cannot be in the past');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      dueDate: defaults.dueDate
    })));

    toast.success(` Due date applied to all ${draftTasks.length} tasks`);
  }, [defaults.dueDate, draftTasks, onDraftsChange, today]);

  // Apply default priority to all tasks
  const handleApplyPriorityToAll = useCallback(() => {
    if (!defaults.priority) {
      toast.error('Please select a priority first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      priority: defaults.priority
    })));

    toast.success(` Priority applied to all ${draftTasks.length} tasks`);
  }, [defaults.priority, draftTasks, onDraftsChange]);

  // Apply default task type to all tasks
  const handleApplyTaskTypeToAll = useCallback(() => {
    if (!defaults.taskType) {
      toast.error('Please select a task type first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      taskType: defaults.taskType
    })));

    toast.success(` Task type applied to all ${draftTasks.length} tasks`);
  }, [defaults.taskType, draftTasks, onDraftsChange]);

  // Handle due date change with validation
  const handleDueDateChange = useCallback((date: string) => {
    if (date && date < today) {
      toast.error('Due date cannot be in the past');
      // Reset to empty or keep current value
      onDefaultsChange({ dueDate: '' });
    } else {
      onDefaultsChange({ dueDate: date });
    }
  }, [onDefaultsChange, today]);

  const errorCount = draftTasks.reduce((count, task) => count + task.errors.length, 0);

  // Get all unique brands for dropdown
  const getAllBrands = useCallback(() => {
    if (getBrandsByCompany) {
      return getBrandsByCompany('all');
    }
    const allBrands = Object.values(companyBrandMap).flat();
    return [...new Set(allBrands)];
  }, [companyBrandMap, getBrandsByCompany]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#1e3a8a]/5 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-[#1e3a8a] flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Task Creator
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Streamline your workflow by adding multiple tasks at once</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Controls - All Dropdowns */}
        <div className="px-6 py-5 border-b bg-gray-50/50">
          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
            {/* Default Assigner */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Assigner *</label>
                <button
                  onClick={handleApplyAssignerToAll}
                  disabled={!defaults.assigner || draftTasks.length === 0}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 uppercase"
                >
                  Apply All
                </button>
              </div>
              <select
                value={defaults.assigner}
                onChange={(e) => onDefaultsChange({ assigner: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
              >
                <option value="">Select assigner</option>
                {effectiveAssignerUsers.map((user: any) => (
                  <option key={user.id || user._id || user.email} value={user.email}>
                    {String(user.email || '').trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Company */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Company *</label>
                <button
                  onClick={handleApplyCompanyToAll}
                  disabled={!defaults.companyName || draftTasks.length === 0}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 uppercase"
                >
                  Apply All
                </button>
              </div>
              <select
                value={companySelectValue}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all disabled:bg-gray-50"
                disabled={isMdImpexUser || availableCompanyOptions.length === 1 || String((currentUser as any)?.role || '').trim().toLowerCase() === 'troubleshoot_manager'}
              >
                <option value="">Select company</option>
                {availableCompanyOptions.map(company => (
                  <option key={company} value={company}>
                    {company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Brand */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Brand</label>
                <button
                  onClick={handleApplyBrandToAll}
                  disabled={!defaults.brand || !defaults.companyName || draftTasks.length === 0}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 uppercase"
                >
                  Apply All
                </button>
              </div>
              <select
                value={defaults.brand}
                onChange={(e) => onDefaultsChange({ brand: e.target.value })}
                disabled={!defaults.companyName}
                className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all ${!defaults.companyName ? 'bg-gray-50 text-gray-400' : ''}`}
              >
                <option value="">Select brand</option>
                {filteredBrands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Due Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Due Date</label>
                <button
                  onClick={handleApplyDueDateToAll}
                  disabled={!defaults.dueDate || draftTasks.length === 0}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 uppercase"
                >
                  Apply All
                </button>
              </div>
              <input
                type="date"
                value={defaults.dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                min={today}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Default Priority */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Priority</label>
                <button
                  onClick={handleApplyPriorityToAll}
                  disabled={!defaults.priority || draftTasks.length === 0}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 uppercase"
                >
                  Apply All
                </button>
              </div>
              <select
                value={defaults.priority}
                onChange={(e) => onDefaultsChange({ priority: e.target.value as BulkPriority })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
              >
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Default Task Type */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Task Type</label>
                <button
                  onClick={handleApplyTaskTypeToAll}
                  disabled={!defaults.taskType || draftTasks.length === 0}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-300 uppercase"
                >
                  Apply All
                </button>
              </div>
              <select
                value={defaults.taskType}
                onChange={(e) => onDefaultsChange({ taskType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all"
                disabled={effectiveAvailableTaskTypes.length === 0}
              >
                {effectiveAvailableTaskTypes.length === 0 ? (
                  <option value="">No types</option>
                ) : (
                  <>
                    <option value="">Select type</option>
                    {effectiveAvailableTaskTypes.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {canonicalizeTaskTypeLabel(typeName)}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Bulk Input Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <textarea
                  value={bulkTaskInput}
                  onChange={(e) => setBulkTaskInput(e.target.value)}
                  placeholder="Enter multiple task titles (one per line)..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm min-h-[100px] resize-none transition-all placeholder:text-gray-400"
                />
                <div className="absolute bottom-3 right-3 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  {bulkTaskInput.split('\n').filter(t => t.trim()).length} Tasks Detected
                </div>
              </div>
              <div className="md:w-48 flex flex-col justify-end">
                <button
                  onClick={handleParseBulkInput}
                  disabled={!bulkTaskInput.trim() || !defaults.assigner || !defaults.companyName}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${!bulkTaskInput.trim() || !defaults.assigner || !defaults.companyName
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 active:scale-[0.98]'
                    }`}
                >
                  <Plus className="h-4 w-4" />
                  Add to List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {draftTasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No tasks added yet</h3>
              <p className="text-gray-500 text-sm">Use the form above to add tasks individually or in bulk</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">{draftTasks.length} task(s) to create</span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      {errorCount} error(s) need fixing
                    </span>
                  )}
                  {summary && summary.failures.length > 0 && (
                    <span className="inline-flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      {summary.failures.length} failed to create
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(draftTasks.map(d => d.title).join('\n'))}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Copy All Titles
                  </button>
                  <button
                    onClick={() => onDraftsChange([])}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 text-left w-16">#</th>
                      <th className="px-4 py-3 text-left">Task Title *</th>
                      <th className="px-4 py-3 text-left w-48">Assigner *</th>
                      <th className="px-4 py-3 text-left w-48">Company & Brand</th>
                      <th className="px-4 py-3 text-left w-36">Due Date</th>
                      <th className="px-4 py-3 text-left w-28">Priority</th>
                      <th className="px-4 py-3 text-left w-32">Task Type</th>
                      <th className="px-4 py-3 text-left w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {draftTasks.map((draft, index) => {
                      const draftCompanyBrands = draft.companyName && draft.companyName !== 'all'
                        ? (getBrandsByCompany ? getBrandsByCompany(draft.companyName) : companyBrandMap[draft.companyName] || [])
                        : getAllBrands();

                      return (
                        <tr key={draft.id} className={draft.errors.length ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-500 font-medium">#{index + 1}</div>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(e) => handleFieldChange(draft.id, 'title', e.target.value)}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Title')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                              placeholder="Enter task title"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={draft.assigner}
                              onChange={(e) => handleFieldChange(draft.id, 'assigner', e.target.value)}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Assigner') || e.includes('email')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
                            >
                              <option value="">Select assigner</option>
                              {effectiveAssignerUsers.map((user: any) => (
                                <option key={user.id || user._id || user.email} value={user.email}>
                                  {String(user.email || '').trim()}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <select
                                value={draft.companyName}
                                onChange={(e) => {
                                  handleFieldChange(draft.id, 'companyName', e.target.value);
                                  handleFieldChange(draft.id, 'brand', '');
                                }}
                                className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Company')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                                disabled={isMdImpexUser}
                              >
                                <option value="">Select company</option>
                                {isMdImpexUser ? (
                                  <option value={MD_IMPEX_COMPANY_NAME}>{MD_IMPEX_COMPANY_NAME}</option>
                                ) : (
                                  <>
                                    <option value="all">All Companies</option>
                                    {Object.keys(companyBrandMap).map(company => (
                                      <option key={company} value={company}>
                                        {company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                      </option>
                                    ))}
                                  </>
                                )}
                              </select>

                              <select
                                value={draft.brand}
                                onChange={(e) => handleFieldChange(draft.id, 'brand', e.target.value)}
                                disabled={!draft.companyName}
                                className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Brand')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${!draft.companyName ? 'bg-gray-100 text-gray-500' : ''}`}
                              >
                                <option value="">Select brand</option>
                                {draftCompanyBrands.map(brand => (
                                  <option key={brand} value={brand}>
                                    {brand.split(' ').map(word =>
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={draft.dueDate}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                if (newDate && newDate < today) {
                                  toast.error('Due date cannot be in the past');
                                } else {
                                  handleFieldChange(draft.id, 'dueDate', newDate);
                                }
                              }}
                              min={today}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('date')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                            />
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={draft.priority}
                              onChange={(e) => handleFieldChange(draft.id, 'priority', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">Select priority</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={draft.taskType}
                              onChange={(e) => handleFieldChange(draft.id, 'taskType', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              disabled={effectiveAvailableTaskTypes.length === 0}
                            >
                              {effectiveAvailableTaskTypes.length === 0 ? (
                                  <option value="">No task types available</option>
                                ) : (
                                  <>
                                    <option value="">Select type</option>
                                    {effectiveAvailableTaskTypes.map((typeName) => (
                                      <option key={typeName} value={typeName.toLowerCase()}>
                                        {canonicalizeTaskTypeLabel(typeName)}
                                      </option>
                                    ))}
                                  </>
                                )}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveDraft(draft.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {draftTasks.length === 0
              ? 'Add tasks using the form above'
              : `Ready to create ${draftTasks.length} task(s)`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={draftTasks.length === 0 || submitting || errorCount > 0}
              className={`px-6 py-2 text-sm font-medium rounded-lg text-white transition-colors flex items-center gap-2 ${draftTasks.length === 0 || errorCount > 0
                ? 'bg-gray-300 cursor-not-allowed'
                : submitting
                  ? 'bg-blue-400'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Tasks...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create {draftTasks.length} Task{draftTasks.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BulkImporter.displayName = 'BulkImporter';

const MobileTaskItem = memo(({
  task,
  isToggling,
  isDeleting,
  currentUser,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  brandLabel,
  onToggleStatus,
  onOpenCommentSidebar,
  onDeleteTask,
  isTaskAssigner,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskPendingApproval,
  onOpenHistoryModal,
  showAssignButton,
  onAssignClick,
  disableStatusToggle,
  hasUnreadComments,
  canEditTask,
  onEditTaskClick,
  onPermanentApproval,
  isUpdatingApproval,
}: MobileTaskItemProps) => {
  const userInfo = getUserInfoForDisplay(task);
  const assignerInfo = useMemo(() => {
    const assignedByUser: any = (task as any)?.assignedByUser;
    const assignedBy: any = (task as any)?.assignedBy;

    const email = (assignedByUser?.email || (typeof assignedBy === 'string' ? assignedBy : assignedBy?.email) || '').toString();
    const name = (assignedByUser?.name || (typeof assignedBy === 'object' ? assignedBy?.name : '') || '').toString();
    const displayName = (name || (email ? email.split('@')[0] : '') || '').toString();

    return {
      name: displayName || email || '—',
      email: email || ''
    };
  }, [task]);
  const isCompleted = isTaskCompleted(task.id);
  const isPendingApproval = isTaskPendingApproval(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const userIsAssigner = isTaskAssigner(task);
  const role = String((currentUser as any)?.role || '').trim().toLowerCase();
  const taskCompanyKey = String((task as any)?.companyName || (task as any)?.company || '').trim().toLowerCase().replace(/\s+/g, '');
  taskCompanyKey === 'speedecom';
  const canDeleteThisTask = (role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'marketer_manager' || role === 'md_manager' || role === 'ob_manager') && userIsAssigner;

  const canEditThisTask = typeof canEditTask === 'function' ? canEditTask(task) : userIsAssigner;
  const normalizeEmailSafe = (v: unknown): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim().toLowerCase();
    if (typeof v === 'object' && v !== null) {
      const email = (v as any).email;
      if (typeof email === 'string') return email.trim().toLowerCase();
    }
    return String(v).trim().toLowerCase();
  };
  const myEmail = normalizeEmailSafe((currentUser as any)?.email);
  const assignedByEmailForCheck =
    normalizeEmailSafe((task as any)?.assignedBy) ||
    normalizeEmailSafe((task as any)?.assignedByUser?.email);
  const isCreator = Boolean(myEmail && assignedByEmailForCheck && myEmail === assignedByEmailForCheck);
  const canShowEditIcon = Boolean(canEditThisTask || isCreator);
  const canShowDeleteIcon = Boolean(canDeleteThisTask);

  const isOverdueTask = isOverdue(task.dueDate, task.status);
  const statusKey = String(task.status || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  const isReassignedTask = statusKey === 'reassigned';
  const brandLabelText = (brandLabel || (task.brand || '')).toString();

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${getTaskBorderColor(task)} border shadow-sm hover:shadow-md transition-all duration-200 mb-3`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              {disableStatusToggle ? (
                <div
                  className={`p-2.5 rounded-lg ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                  title={isCompleted ? 'Completed' : 'Pending'}
                >
                  {getTaskStatusIcon(task.id, isCompleted)}
                </div>
              ) : (
                <button
                  onClick={() => onToggleStatus(task.id, task)}
                  disabled={isToggling}
                  className={`p-2.5 rounded-lg transition-all ${isCompleted ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                >
                  {getTaskStatusIcon(task.id, isCompleted)}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 break-words leading-relaxed">{task.title}</h3>
                  {isOverdueTask && !isCompleted && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                      Overdue
                    </span>
                  )}
                  {isReassignedTask && !isCompleted && (
                    <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                      Reassigned
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-words">{task.message}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="text-gray-400">Assign To</span>
                    {userInfo.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    <span className="text-gray-400">Assign By</span>
                    <span className="break-all">{assignerInfo.email || '—'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end mt-2 md:mt-0">
            {showAssignButton && typeof onAssignClick === 'function' && (
              <button
                onClick={() => onAssignClick(task)}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Assign"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onOpenCommentSidebar(task)}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
              title="View comments"
            >
              <MessageSquare className="h-4 w-4" />
              {hasUnreadComments && hasUnreadComments(task.id) && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            <button
              onClick={() => onOpenHistoryModal(task)}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View history"
            >
              <History className="h-4 w-4" />
            </button>

            {canShowEditIcon && (
              <button
                onClick={() => onEditTaskClick(task)}
                disabled={isPermanentlyApproved}
                className={`p-1 rounded-lg transition-colors ${isPermanentlyApproved ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
                title={isPermanentlyApproved ? "Editing not allowed for permanently approved tasks" : "Edit task"}
              >
                <Edit className="h-4 w-4" />
              </button>
            )}

            {canShowDeleteIcon && typeof onDeleteTask === 'function' && (
              <button
                onClick={() => onDeleteTask(task.id)}
                disabled={isDeleting}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {userIsAssigner && isCompleted && (
              <button
                onClick={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
                disabled={isUpdatingApproval}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                title={isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
              >
                {isUpdatingApproval ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPermanentlyApproved ? (
                  <EyeOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Eye className="h-4 w-4 text-blue-500" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            {isCompleted && (
              <span className={`text-xs px-2 py-1 rounded-full ${isPermanentlyApproved ? 'bg-blue-100 text-blue-800 border border-blue-200' : isPendingApproval ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                {isPermanentlyApproved ? ' Permanent' : isPendingApproval ? '⏳ Pending Approval' : ' Approved'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {task.type && (
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded break-words">
                {task.type}
              </span>
            )}
            {brandLabelText && (
              <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded break-words" title={brandLabelText}>
                {brandLabelText}
              </span>
            )}
            {task.company && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded break-words">
                {task.company}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MobileTaskItem.displayName = 'MobileTaskItem';
const DesktopTaskItem = memo(({
  index,
  task,
  isToggling,
  currentUser,
  formatDate,
  isOverdue,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  brandLabel,
  brands,
  onToggleStatus,
  onEditTaskClick,
  onOpenCommentSidebar,
  onOpenHistoryModal,
  onDeleteTask,
  showAssignButton,
  onAssignClick,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskAssigner,
  canEditTask,
  onPermanentApproval,
  isUpdatingApproval,
  disableStatusToggle,
  hasUnreadComments,
  hideAssignBy,
  assignedFilter
}: DesktopTaskItemProps) => {

  const userInfo = getUserInfoForDisplay(task);
  const assignerInfo = useMemo(() => {
    const assignedByUser: any = (task as any)?.assignedByUser;
    const assignedBy: any = (task as any)?.assignedBy;

    const email = (assignedByUser?.email || (typeof assignedBy === 'string' ? assignedBy : assignedBy?.email) || '').toString();
    const name = (assignedByUser?.name || (typeof assignedBy === 'object' ? assignedBy?.name : '') || '').toString();
    const displayName = (name || (email ? email.split('@')[0] : '') || '').toString();

    return {
      name: displayName || email || '—',
      email: email || ''
    };
  }, [task]);
  const isCompleted = isTaskCompleted(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const userIsAssigner = isTaskAssigner(task);
  const canEditThisTask = typeof canEditTask === 'function' ? canEditTask(task) : userIsAssigner;
  const role = String((currentUser as any)?.role || '').trim().toLowerCase();

  const normalizeEmailSafe = (v: unknown): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim().toLowerCase();
    if (typeof v === 'object' && v !== null) {
      const email = (v as any).email;
      if (typeof email === 'string') return email.trim().toLowerCase();
    }
    return String(v).trim().toLowerCase();
  };

  const myEmail = normalizeEmailSafe((currentUser as any)?.email);
  const assignedByEmailForCheck =
    normalizeEmailSafe((task as any)?.assignedBy) ||
    normalizeEmailSafe((task as any)?.assignedByUser?.email);
  const isCreator = Boolean(myEmail && assignedByEmailForCheck && myEmail === assignedByEmailForCheck);

  const canDeleteThisTask = (role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'marketer_manager' || role === 'md_manager' || role === 'ob_manager') && userIsAssigner;

  // Edit/Delete should not be coupled to create_task permission.
  // Show edit if user can edit OR they are the creator (assignedBy matches user).
  const canShowEditIcon = Boolean(canEditThisTask || isCreator);
  const canShowDeleteIcon = Boolean(canDeleteThisTask);
  const isOverdueTask = isOverdue(task.dueDate, task.status);
  const statusKey = String(task.status || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  const isReassignedTask = statusKey === 'reassigned';
  const isInProgressTask = statusKey === 'in-progress';


  const createdAtRaw = (task as any)?.createdAt || (task as any)?.created_at || (task as any)?.timestamp || (task as any)?.createdOn || '';
  const createdAtText = (() => {
    try {
      if (!createdAtRaw) return '—';
      // Prefer a date-time formatter if present in this module
      const anyGlobal = globalThis as any;
      if (typeof (anyGlobal as any).formatDateTime === 'function') {
        return (anyGlobal as any).formatDateTime(createdAtRaw);
      }
      const asDate = new Date(createdAtRaw);
      if (!Number.isFinite(asDate.getTime())) return '—';
      return asDate.toLocaleString();
    } catch {
      return '—';
    }
  })();
  const brandLabelText = useMemo(() => {
    if (brandLabel) return String(brandLabel || '');

    const taskBrandId = (task as any)?.brandId;
    const taskBrandRaw = (task.brand || '').toString();
    const taskBrandKey = taskBrandRaw.trim().toLowerCase();

    const list = brands || [];
    if (!list.length) return taskBrandRaw;

    if (taskBrandId != null && String(taskBrandId).trim()) {
      const idKey = String(taskBrandId).trim();
      const byId = list.find((b) => String((b as any)?._id || (b as any)?.id || '').trim() === idKey);
      if (byId?.name) return String(byId.name);
    }

    if (taskBrandKey) {
      const byName = list.find((b) => String((b as any)?.name || '').trim().toLowerCase() === taskBrandKey);
      if (byName?.name) return String(byName.name);
    }

    return taskBrandRaw;
  }, [brandLabel, brands, task]);

  return (
    <div className={`relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-2 overflow-hidden`}>
      {/* Left colored border indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-green-500' :
        isOverdueTask ? 'bg-red-500' :
          isInProgressTask ? 'bg-orange-500' :
            'bg-primary-light'
        }`} />

      <div className="grid grid-cols-11 gap-0.5 p-2.5 items-center pl-2">
        {/* Index + Status Column */}
        <div className="col-span-1 flex items-center justify-center gap-1">
          <span className="text-xs font-semibold text-primary-dark tabular-nums w-4 text-right">
            {index}
          </span>
          {disableStatusToggle ? (
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}
              title={isCompleted ? 'Completed' : 'Pending'}
            >
              {getTaskStatusIcon(task.id, isCompleted)}
            </div>
          ) : (
            <button
              onClick={() => onToggleStatus(task.id, task)}
              disabled={isToggling}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isCompleted
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-primary-ultralight hover:text-primary-main'
                } disabled:opacity-50`}
              title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
            >
              {getTaskStatusIcon(task.id, isCompleted)}
            </button>
          )}
        </div>

        {/* Brand Column */}
        <div className="col-span-1 flex items-center justify-center">
          <span className="text-[10px] font-medium text-primary-main px-2 py-0.5 bg-primary-ultralight rounded-md truncate max-w-[85px] text-center" title={brandLabelText}>
            {brandLabelText || "—"}
          </span>
        </div>

        {/* Task Title Column */}
        <div className={hideAssignBy ? "col-span-3 min-w-0" : "col-span-2 min-w-0"}>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-semibold text-gray-900 text-xs leading-tight break-words" title={task.title}>
              {task.title}
            </h3>
            <div className="flex items-center gap-1">
              {isOverdueTask && !isCompleted && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  <Clock className="h-2.5 w-2.5" />
                  Overdue
                </span>
              )}
              {isReassignedTask && !isCompleted && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                  <UserPlus className="h-2.5 w-2.5" />
                  Reassigned
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Assign To Column */}
        {assignedFilter !== 'assigned-to-me' && (
          <div className="col-span-1 min-w-0 flex items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-primary-ultralight flex items-center justify-center shrink-0">
                <span className="text-[9px] font-semibold text-primary-dark">
                  {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : '—'}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-700 truncate max-w-[50px]" title={userInfo.email}>
                {userInfo.name || '—'}
              </span>
            </div>
          </div>
        )}

        {/* Assign By Column */}
        {!hideAssignBy && (
          <div className="col-span-1 min-w-0 flex items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300 shrink-0">
                <span className="text-[9px] font-semibold text-gray-700">
                  {assignerInfo.name ? assignerInfo.name.charAt(0).toUpperCase() : '—'}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-600 truncate max-w-[50px]" title={assignerInfo.email}>
                {assignerInfo.name || '—'}
              </span>
            </div>
          </div>
        )}

        {/* Created At Column */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-[10px] text-gray-600 font-medium block leading-tight" title={createdAtText}>
              {createdAtText}
            </span>
          </div>
        </div>

        {/* Due Date + Priority Column - Side by Side */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className={`text-[10px] font-semibold leading-tight ${isOverdueTask && !isCompleted ? 'text-red-700' : 'text-gray-900'
                }`}>
                {formatDate(task.dueDate)}
              </span>
              {task.priority && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                  {task.priority.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Last Comment Column */}
        <div className="col-span-2 min-w-0 flex items-center pl-2.5 border-l border-gray-200">
          {(task as any).latestComment ? (
            <div
              className="flex flex-col gap-0.5 cursor-pointer hover:bg-primary-ultralight p-1 rounded transition-all w-full"
              onClick={() => onOpenCommentSidebar(task)}
              title={(task as any).latestComment.content}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-primary-main truncate max-w-[65px]">
                  {(task as any).latestComment.userName}
                </span>
                <span className="text-[8px] text-gray-400 shrink-0">
                  {new Date((task as any).latestComment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 line-clamp-1 leading-tight">
                "{(task as any).latestComment.content}"
              </p>
            </div>
          ) : (
            <button
              onClick={() => onOpenCommentSidebar(task)}
              className="text-[9px] text-gray-400 italic hover:text-primary-main transition-colors"
            >
              Add comment
            </button>
          )}
        </div>

        {/* Actions Column */}
        <div className="col-span-1 flex items-center justify-end gap-1">
          {/* Status Badge */}
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isCompleted
            ? (isPermanentlyApproved
              ? 'bg-blue-100 text-primary-dark border border-primary-light'
              : 'bg-green-100 text-green-800 border border-green-300')
            : isInProgressTask
              ? 'bg-orange-100 text-orange-800 border border-orange-300'
              : isReassignedTask
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
            {isCompleted ? (isPermanentlyApproved ? 'APR' : 'COM') :
              isInProgressTask ? 'PRG' :
                isReassignedTask ? 'REA' : 'PND'}
          </span>

          {/* Action Buttons */}
          <div className="flex items-center">
            {showAssignButton && typeof onAssignClick === 'function' && (
              <button
                onClick={() => onAssignClick(task)}
                className="p-0.5 text-gray-500 hover:text-primary-main hover:bg-primary-ultralight rounded transition-all"
                title="Assign"
              >
                <UserPlus className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => onOpenCommentSidebar(task)}
              className="p-0.5 text-gray-500 hover:text-primary-main hover:bg-primary-ultralight rounded transition-all relative"
              title="View comments"
            >
              <MessageSquare className="h-3 w-3" />
              {hasUnreadComments && hasUnreadComments(task.id) && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>

            <button
              onClick={() => onOpenHistoryModal(task)}
              className="p-0.5 text-gray-500 hover:text-primary-main hover:bg-primary-ultralight rounded transition-all"
              title="View history"
            >
              <History className="h-3 w-3" />
            </button>

            {canShowEditIcon && (
              <button
                onClick={() => onEditTaskClick(task)}
                disabled={isPermanentlyApproved}
                className={`p-0.5 rounded transition-all ${isPermanentlyApproved
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-primary-main hover:bg-primary-ultralight'
                  }`}
                title={isPermanentlyApproved ? "Editing not allowed" : "Edit task"}
              >
                <Edit className="h-3 w-3" />
              </button>
            )}

            {canShowDeleteIcon && typeof onDeleteTask === 'function' && (
              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-0.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}

            {userIsAssigner && isCompleted && (
              <button
                onClick={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
                disabled={isUpdatingApproval}
                className="p-0.5 text-gray-500 hover:text-primary-main hover:bg-primary-ultralight rounded transition-all disabled:opacity-50"
                title={isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
              >
                {isUpdatingApproval ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPermanentlyApproved ? (
                  <EyeOff className="h-3 w-3 text-red-500" />
                ) : (
                  <Eye className="h-3 w-3 text-primary-main" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopTaskItem.displayName = 'DesktopTaskItem';

// ==================== COMMENT SIDEBAR ====================
const CommentSidebar = memo(({
  showCommentSidebar,
  selectedTask,
  commentLoading,
  currentUser,
  formatDate,
  isOverdue,
  formatBrandLabel,
  onCloseSidebar,
  onSaveComment,
  getTaskComments,
  getUserInfoForDisplay,
  isTaskCompleted,
  getStatusBadgeColor,
  getStatusText,
  loadingComments,
  loadingHistory,
  defaultTab = 'details'
}: any) => {
  const [localComment, setLocalComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'permanent-history'>(defaultTab);

  if (!showCommentSidebar || !selectedTask) return null;

  const taskComments = getTaskComments(selectedTask.id);
  const userInfo = getUserInfoForDisplay(selectedTask);
  const isCompleted = isTaskCompleted(selectedTask.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1e3a8a]/10 backdrop-blur-sm" onClick={onCloseSidebar}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#1e3a8a]">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1e3a8a]">Activity Timeline</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Task Logs & Events</p>
              </div>
            </div>
            <button onClick={onCloseSidebar} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Task</h3>
            </div>
            <p className="text-sm font-bold text-gray-800 leading-snug">{selectedTask.title}</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex bg-gray-100/70 p-1 rounded-xl border border-gray-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'details' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('permanent-history')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'permanent-history' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Timeline
              </button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                {/* Task Details Summary */}
                <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(selectedTask.id)}`}>
                        {getStatusText(selectedTask.id)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority</div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedTask.priority === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                        selectedTask.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-green-50 text-green-700 border-green-100'
                        }`}>
                        {selectedTask.priority?.toUpperCase() || 'NOT SET'}
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned To</div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-[10px] font-bold uppercase">
                          {userInfo.email?.charAt(0)}
                        </div>
                        <div className="text-xs font-bold text-gray-800 truncate">
                          {userInfo.email}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-800">{formatDate(selectedTask.dueDate)}</span>
                        {isOverdue(selectedTask.dueDate, selectedTask.status) && !isCompleted && (
                          <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight">Overdue</span>
                        )}
                      </div>
                    </div>

                    {selectedTask.type && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</div>
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-gray-400" />
                          {selectedTask.type}
                        </div>
                      </div>
                    )}

                    {selectedTask.company && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</div>
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-gray-400" />
                          {selectedTask.company}
                        </div>
                      </div>
                    )}

                    {selectedTask.brand && (
                      <div className="col-span-2 space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Brand</div>
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-gray-400" />
                          {(typeof formatBrandLabel === 'function' ? formatBrandLabel(selectedTask) : selectedTask.brand)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#1e3a8a]">
                    <MessageSquare className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Add Comment</h4>
                  </div>
                  <div className="relative group">
                    <textarea
                      value={localComment}
                      onChange={(e) => setLocalComment(e.target.value)}
                      placeholder="Share updates or feedback..."
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-[120px] resize-none transition-all placeholder:text-gray-300"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSaveComment(localComment);
                          setLocalComment('');
                        }}
                        disabled={!localComment.trim() || commentLoading}
                        className="h-10 w-10 bg-[#1e3a8a] text-white rounded-xl shadow-lg shadow-blue-900/20 hover:bg-[#1e3a8a]/90 disabled:opacity-50 disabled:scale-95 transition-all flex items-center justify-center"
                        title="Send Comment"
                      >
                        {commentLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Permanent History Tab */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#1e3a8a]">
                    <History className="h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Timeline</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-full">
                    {taskComments ? taskComments.length : 0} Items
                  </span>
                </div>

                {/* Loading State */}
                {(loadingHistory || loadingComments) ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-200" />
                    <p className="text-xs font-bold uppercase tracking-widest">Fetching data...</p>
                  </div>
                ) : taskComments && taskComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <FileClock className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest text-center">No Activity Recorded Yet</p>
                  </div>
                ) : (
                  <div className="relative pl-4 space-y-6 before:absolute before:left-[1px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gradient-to-b before:from-blue-200 before:to-transparent">
                    {taskComments?.map((comment: CommentType) => (
                      <div key={comment.id} className="relative group">
                        {/* Dot */}
                        <div className="absolute -left-[19.5px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-sm" />

                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                {comment.userName?.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-gray-800">{comment.userName}</span>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>

                          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {(comment.content || '').trim()}
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full">
                              {comment.userRole}
                            </span>
                            {comment.userId === currentUser.id && (
                              <span className="text-[9px] font-bold text-blue-500 uppercase flex items-center gap-1">
                                <CheckCircle className="h-2.5 w-2.5" />
                                Your Update
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CommentSidebar.displayName = 'CommentSidebar';


// ==================== APPROVAL MODAL ====================
const ApprovalModal = memo(({
  showApprovalModal,
  taskToApprove,
  approvalAction,
  approvingTasks,
  onClose,
  onApprove
}: ApprovalModalProps) => {
  if (!showApprovalModal || !taskToApprove) return null;

  const isApproving = approvingTasks.includes(taskToApprove.id);
  const isApproveAction = approvalAction === 'approve';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${isApproveAction ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {isApproveAction ? <CheckCircle className="h-6 w-6" /> : <X className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isApproveAction ? 'Approve Task' : 'Reject Task'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isApproveAction ? 'Confirm approval of this task' : 'Confirm rejection of this task completion'}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{taskToApprove.title}</h3>
            <p className="text-sm text-gray-600">{taskToApprove.message}</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              disabled={isApproving}
            >
              Cancel
            </button>
            <button
              onClick={() => onApprove(isApproveAction)}
              disabled={isApproving}
              className={`px-6 py-2 text-sm font-medium rounded-lg text-white ${isApproveAction ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50 flex items-center gap-2`}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isApproveAction ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {isApproving ? 'Processing...' : isApproveAction ? 'Approve Task' : 'Reject Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ApprovalModal.displayName = 'ApprovalModal';

const PermanentHistoryTimeline = memo(({
  timelineItems,
  loadingHistory,
  loadingComments,
  currentUser,
  formatDateTime
}: {
  timelineItems: HistoryDisplayItem[];
  loadingHistory: boolean;
  loadingComments: boolean;
  currentUser: UserType;
  formatDateTime: (date: string) => string;
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // 1. Duplicate items remove karne ke liye
  const uniqueTimelineItems = useMemo(() => {
    const seenIds = new Set<string>();
    const uniqueItems: HistoryDisplayItem[] = [];

    timelineItems.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueItems.push(item);
      }
    });

    return uniqueItems;
  }, [timelineItems]);

  // 2. Agar comment ID same hai to unhe bhi group kar sakte hain
  const groupedTimelineItems = useMemo(() => {
    const commentMap = new Map<string, HistoryDisplayItem>();
    const nonCommentItems: HistoryDisplayItem[] = [];

    uniqueTimelineItems.forEach(item => {
      if (item.type === 'comment') {
        const commentData = item.data as CommentType;
        // Same content wale comments check karein
        const key = `${commentData.content}-${commentData.userId}`;
        if (!commentMap.has(key)) {
          commentMap.set(key, item);
        }
      } else {
        nonCommentItems.push(item);
      }
    });

    return [...Array.from(commentMap.values()), ...nonCommentItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [uniqueTimelineItems]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  if (loadingHistory || loadingComments) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-2 text-gray-500">Loading history...</p>
      </div>
    );
  }

  const displayItems = groupedTimelineItems.length > 0 ? groupedTimelineItems : uniqueTimelineItems;

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-8">
        <FileClock className="h-12 w-12 mx-auto text-gray-300" />
        <p className="mt-2 text-gray-500">No history available</p>
        <p className="text-xs text-gray-400 mt-1">All activities will be permanently recorded here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pl-4 before:absolute before:left-[1px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gradient-to-b before:from-blue-200 before:to-transparent">
      {displayItems.map((item, index) => {
        const isComment = item.type === 'comment';
        const isExpanded = expandedItems.includes(item.id);
        const isCurrentUserAuthor = isComment && (item.data as CommentType).userId === currentUser.id;

        return (
          <div
            key={`${item.type}-${item.id}-${index}`}
            className="relative"
          >
            {/* Dot */}
            <div className={`absolute -left-[19.5px] top-1.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${isComment ? 'bg-blue-500' : 'bg-[#10b981]'}`} />

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${isComment ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {isComment ? <MessageSquare className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800">
                      {isComment
                        ? (item.data as CommentType).userName
                        : (item.data as TaskHistory).userName}
                    </span>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                      {formatDateTime(item.timestamp)}
                    </div>
                  </div>
                </div>
                {isComment && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                {isComment ? (
                  <div className={`text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50/50 p-3 rounded-xl border border-gray-100 ${isExpanded ? '' : 'max-h-20 overflow-hidden'}`}>
                    {(item.data as CommentType).content || '—'}
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-800 mb-2">{(item.data as TaskHistory).message || 'Activity Recorded'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Action</span>
                        <span className="text-[10px] font-bold text-[#1e3a8a] truncate">{(item.data as TaskHistory).action?.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                      {(item.data as TaskHistory).action === 'status_changed' && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Transition</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                            <span className="truncate max-w-[40px]">{(item.data as TaskHistory).additionalData?.fromStatus}</span>
                            <span className="text-gray-300">→</span>
                            <span className="truncate max-w-[40px]">{(item.data as TaskHistory).additionalData?.toStatus}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full">
                  {isComment
                    ? (item.data as CommentType).userRole
                    : (item.data as TaskHistory).userRole}
                </span>
                {isCurrentUserAuthor && (
                  <span className="text-[9px] font-bold text-blue-500 uppercase flex items-center gap-1">
                    <CheckCircle className="h-2.5 w-2.5" />
                    Your Update
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

PermanentHistoryTimeline.displayName = 'PermanentHistoryTimeline';
// ==================== REASSIGN MODAL ====================
const ReassignModal = memo(({
  showReassignModal,
  reassignTask,
  newAssigneeId,
  newDueDate,
  reassignComment,
  reassignLoading,
  users,
  currentUser,
  onClose,
  onAssigneeChange,
  onDueDateChange,
  onCommentChange,
  onReassign
}: ReassignModalProps) => {
  if (!showReassignModal || !reassignTask) return null;

  const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();
  const normalizeCompanyKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  const KEYURI_EMAIL = 'keyurismartbiz@gmail.com';
  const RUTU_EMAIL = 'rutusmartbiz@gmail.com';
  const myEmail = normalizeEmail((currentUser as any)?.email);
  const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const myRoleKey = normalizeRole((currentUser as any)?.role);
  const myId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
  const myManagerId = String((currentUser as any)?.managerId || '').trim();
  const isObManager = myRoleKey === 'ob_manager';
  const isSbmRole = myRoleKey === 'sbm';
  const isRmOrAmRole = myRoleKey === 'rm' || myRoleKey === 'am';

  const taskCompanyKey = normalizeCompanyKey((reassignTask as any)?.companyName || (reassignTask as any)?.company);
  const isSpeedEcomTask = taskCompanyKey === 'speedecom';
  const taskStatusKey = String((reassignTask as any)?.status || '').trim().toLowerCase();
  const isTaskCompleted = taskStatusKey === 'completed';

  const allowedPairUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (myId) ids.add(myId);

    const list = Array.isArray(users) ? users : [];

    if (myRoleKey === 'rm') {
      list.forEach((u: any) => {
        const uid = String(u?.id || u?._id || '').trim();
        const urole = normalizeRole(u?.role);
        const mgr = String(u?.managerId || '').trim();
        if (uid && urole === 'am' && mgr && myId && mgr === myId) ids.add(uid);
      });
    }

    if (myRoleKey === 'am') {
      if (myManagerId) ids.add(myManagerId);
    }

    return ids;
  }, [myId, myManagerId, myRoleKey, normalizeRole, users]);

  const assignedByCandidate: any = (reassignTask as any)?.assignedByUser || (reassignTask as any)?.assignedBy;
  const assignedByEmail = (typeof assignedByCandidate === 'string'
    ? (assignedByCandidate.includes('@') ? assignedByCandidate : '')
    : String(assignedByCandidate?.email || '')
  ).trim().toLowerCase();

  const assignedToCandidate: any = (reassignTask as any)?.assignedToUser || (reassignTask as any)?.assignedTo;
  const assignedToId = typeof assignedToCandidate === 'object'
    ? String(assignedToCandidate?.id || assignedToCandidate?._id || '').trim()
    : '';
  const assignedToEmail = (typeof assignedToCandidate === 'string'
    ? (assignedToCandidate.includes('@') ? assignedToCandidate : '')
    : String(assignedToCandidate?.email || '')
  ).trim().toLowerCase();

  const isTaskAssignee = Boolean(
    (myEmail && assignedToEmail && myEmail === assignedToEmail) ||
    (myId && assignedToId && myId === assignedToId)
  );

  const isManagerRole = myRoleKey === 'manager' || myRoleKey === 'marketer_manager' || myRoleKey === 'md_manager';
  const assignedById = typeof assignedByCandidate === 'object'
    ? String(assignedByCandidate?.id || assignedByCandidate?._id || '').trim()
    : '';
  const assignedByUserId = String((assignedByCandidate as any)?.id || (assignedByCandidate as any)?._id || assignedById || '').trim();

  const isTaskAssigner = Boolean(
    (myEmail && assignedByEmail && myEmail === assignedByEmail) ||
    (myId && assignedById && myId === assignedById)
  );
  const isKeyuri = Boolean(myEmail && myEmail === KEYURI_EMAIL);

  const canReassignByPairEmailFallback = useMemo(() => {
    if (!isRmOrAmRole || !isTaskCompleted) return false;
    const creatorEmailKey = normalizeEmail(assignedByEmail);
    if (!creatorEmailKey) return false;

    const list = Array.isArray(users) ? users : [];

    if (myRoleKey === 'rm' && myId) {
      return list.some((u: any) => {
        const urole = normalizeRole(u?.role);
        const mgr = String(u?.managerId || '').trim();
        const uemail = normalizeEmail(u?.email);
        return urole === 'am' && mgr === myId && uemail && uemail === creatorEmailKey;
      });
    }

    if (myRoleKey === 'am') {
      const myManagerIdKey = String((currentUser as any)?.managerId || '').trim();
      const myManager = myManagerIdKey
        ? list.find((u: any) => String(u?.id || u?._id || '').trim() === myManagerIdKey)
        : undefined;
      const managerEmail = normalizeEmail((myManager as any)?.email);
      return Boolean(managerEmail && managerEmail === creatorEmailKey);
    }

    return false;
  }, [assignedByEmail, currentUser, isRmOrAmRole, isTaskCompleted, myId, myRoleKey, normalizeEmail, normalizeRole, users]);

  const canReassign = isSpeedEcomTask
    ? Boolean(
      isTaskCompleted &&
      (
        isTaskAssigner ||
        (isSbmRole && isTaskAssigner) ||
        (
          isRmOrAmRole &&
          (
            isTaskAssignee ||
            (assignedByUserId && allowedPairUserIds.has(assignedByUserId)) ||
            canReassignByPairEmailFallback
          )
        )
      )
    )
    : Boolean(
      isObManager ||
      isKeyuri ||
      (isManagerRole && isTaskAssigner) ||
      (isSbmRole && isTaskAssigner) ||
      (isRmOrAmRole && isTaskCompleted && (isTaskAssigner || (assignedByUserId && allowedPairUserIds.has(assignedByUserId)) || canReassignByPairEmailFallback))
    );

  const isAssistantRole = (v: unknown) => {
    const r = normalizeRole(v);
    return r === 'assistant' || r === 'sub_assistance' || r === 'assistance' || r.includes('assistant');
  };

  const ensureRutuCandidate = useMemo(() => {
    if (isSpeedEcomTask) return users || [];
    const hasRutu = (users || []).some((u: any) => normalizeEmail(u?.email) === normalizeEmail(RUTU_EMAIL));
    if (hasRutu) return users || [];
    return [
      ...(users || []),
      {
        id: RUTU_EMAIL,
        name: RUTU_EMAIL.split('@')[0] || 'User',
        email: RUTU_EMAIL,
        role: 'sub_assistance'
      } as any
    ];
  }, [isSpeedEcomTask, users]);

  const availableUsers = (ensureRutuCandidate || [])
    .filter((user: any) => {
      const uid = String(user?.id || user?._id || '').trim();
      const uemail = String(user?.email || '').trim().toLowerCase();
      const urole = normalizeRole((user as any)?.role);
      const userCompanyKey = normalizeCompanyKey((user as any)?.companyName || (user as any)?.company);

      if (isSpeedEcomTask) {
        if (!userCompanyKey || userCompanyKey !== 'speedecom') return false;

        // Speed E Com reassign modal: only show current assignee email (no other users)
        if ((assignedToId && uid && uid !== assignedToId) || (assignedToEmail && uemail && uemail !== assignedToEmail)) {
          return false;
        }

        return Boolean(
          (assignedToId && uid && uid === assignedToId) ||
          (assignedToEmail && uemail && uemail === assignedToEmail)
        );
      }

      // Original logic for non-Speed E Com tasks
      if (assignedToId && uid && uid === assignedToId) return false;
      if (assignedToEmail && uemail && uemail === assignedToEmail) return false;

      // RM/AM should not see other-company users
      if (isRmOrAmRole) {
        if (!userCompanyKey || (taskCompanyKey && userCompanyKey !== taskCompanyKey)) return false;
        if (urole === 'sbm' || urole === 'admin' || urole === 'super_admin') return true;
        return Boolean(uid && allowedPairUserIds.has(uid));
      }

      return true;
    })
    .filter(() => {
      // SpeedEcom role filtering already handled above
      if (isSpeedEcomTask) return true;
      return true;
    })
    .filter(user => !isObManager || isAssistantRole((user as any)?.role))
    .filter((user: any) => {
      if (!canReassign) return true;
      if (isObManager) return true;
      if (isKeyuri && !(isManagerRole && isTaskAssigner)) {
        const email = normalizeEmail(user?.email);
        const urole = normalizeRole((user as any)?.role);
        return email === RUTU_EMAIL || urole === 'sub_assistance';
      }
      return true;
    });

  const dueDateValue = newDueDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Reassign Task</h2>
              <p className="text-sm text-gray-500 mt-1">Assign this task to another user</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-900 mb-1">{reassignTask.title}</h3>
              <p className="text-sm text-gray-600 truncate">{reassignTask.message}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Assignee Email
              </label>
              <input
                type="text"
                value={assignedToEmail || '—'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDateValue}
                onChange={onDueDateChange}
                disabled={reassignLoading || !canReassign}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Assignee
              </label>
              <select
                value={newAssigneeId}
                onChange={onAssigneeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={reassignLoading || !canReassign || isSpeedEcomTask}
              >
                <option value="">Select a user</option>
                {availableUsers.map(user => (
                  <option key={user.email || user.id} value={user.email}>
                    {String(user.email || '').trim()}
                  </option>
                ))}
              </select>
              {!canReassign && (
                <p className="mt-2 text-sm text-red-600">You do not have permission to reassign tasks</p>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment
              </label>
              <textarea
                value={reassignComment}
                onChange={onCommentChange}
                disabled={reassignLoading || !canReassign}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[90px]"
                placeholder="Add a comment..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              disabled={reassignLoading}
            >
              Cancel
            </button>
            <button
              onClick={onReassign}
              disabled={!canReassign || !newAssigneeId || reassignLoading}
              className="px-6 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {reassignLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {reassignLoading ? 'Reassigning...' : 'Reassign Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ReassignModal.displayName = 'ReassignModal';

const TaskHistoryModal = memo(({
  showHistoryModal,
  historyTask,
  timelineItems,
  loadingHistory,
  loadingComments,
  currentUser,
  users,
  onClose,
  getEmailByIdInternal,
  getAssignerEmail
}: {
  showHistoryModal: boolean;
  historyTask: Task | null;
  timelineItems: HistoryDisplayItem[];
  loadingHistory: boolean;
  loadingComments: boolean;
  currentUser: UserType;
  users: UserType[];
  onClose: () => void;
  formatDate: (date: string) => string;
  getEmailByIdInternal?: (userId: any) => string;
  getAssignerEmail?: (task: Task) => string;
}) => {
  if (!showHistoryModal || !historyTask) return null;

  // Format creation date for display
  const formattedCreatedAt = formatDateTime(historyTask.createdAt || historyTask.updatedAt || new Date().toISOString());

  // Get creator and assignee emails
  const getCreatorEmail = () => {
    if (getAssignerEmail) {
      return getAssignerEmail(historyTask);
    }

    if (getEmailByIdInternal) {
      return getEmailByIdInternal(historyTask.assignedBy);
    }

    // Fallback logic
    if (!historyTask.assignedBy) return 'Unknown';

    const assignedByFallback = typeof historyTask.assignedBy === 'string'
      ? historyTask.assignedBy
      : ((historyTask.assignedBy as any)?.email || (historyTask.assignedBy as any)?.name || '');

    if (typeof historyTask.assignedBy === 'object' && historyTask.assignedBy !== null) {
      const assignerObj = historyTask.assignedBy as any;
      if (assignerObj.email) return assignerObj.email;
      if (assignerObj.name) return assignerObj.name;
    }

    // Try to find in users
    const creatorUser = users.find(u =>
      u.id === assignedByFallback ||
      u._id === assignedByFallback ||
      u.email === assignedByFallback
    );

    return creatorUser?.email || assignedByFallback || 'Unknown';
  };

  const getAssigneeEmail = () => {
    if (getEmailByIdInternal) {
      return getEmailByIdInternal(historyTask.assignedTo);
    }

    // Fallback logic
    const assignedTo = historyTask.assignedTo;
    if (typeof assignedTo === 'string') {
      if (assignedTo.includes('@')) {
        return assignedTo;
      } else {
        const user = users.find(u =>
          u.id === assignedTo ||
          u._id === assignedTo ||
          u.email === assignedTo
        );

        if (user) {
          return user.email || user.name || 'Unknown';
        }

        return 'Unknown';
      }
    }

    return 'Unknown';
  };

  const creatorEmail = getCreatorEmail();
  const assigneeEmail = getAssigneeEmail();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1e3a8a]/10 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#1e3a8a]">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1e3a8a]">Activity Timeline</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Task Logs & Events</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Task</h3>
            </div>
            <p className="text-sm font-bold text-gray-800 leading-snug">{historyTask.title}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="text-[10px] text-gray-600">
                <span className="font-bold text-gray-400 uppercase tracking-wider">Assigned By:</span>
                <div className="font-bold text-gray-800 truncate">{creatorEmail || 'Unknown'}</div>
              </div>
              <div className="text-[10px] text-gray-600">
                <span className="font-bold text-gray-400 uppercase tracking-wider">Assigned To:</span>
                <div className="font-bold text-gray-800 truncate">{assigneeEmail || 'Unknown'}</div>
              </div>
              <div className="col-span-2 text-[10px] text-gray-600">
                <span className="font-bold text-gray-400 uppercase tracking-wider">Created:</span>
                <span className="ml-2 font-bold text-gray-800">{formattedCreatedAt}</span>
              </div>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <PermanentHistoryTimeline
              timelineItems={timelineItems}
              loadingHistory={loadingHistory}
              loadingComments={loadingComments}
              currentUser={currentUser}
              formatDateTime={formatDateTime}
            />
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
            >
              Close History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

TaskHistoryModal.displayName = 'TaskHistoryModal';

// ==================== MAIN COMPONENT ====================
const AllTasksPage: React.FC<AllTasksPageProps> = memo(({
  tasks,
  filter,
  setFilter,
  dateFilter,
  setDateFilter,
  assignedFilter,
  setAssignedFilter,
  searchTerm,
  setSearchTerm,
  currentUser,
  users,
  onDeleteTask,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  openMenuId,
  setOpenMenuId,
  onToggleTaskStatus,
  onCreateTask,
  onSaveComment,
  onDeleteComment,
  onFetchTaskComments,
  onReassignTask,
  onMdImpexReassignTask,
  onApproveTask,
  onUpdateTaskApproval,
  onFetchTaskHistory,
  onBulkCreateTasks,
  brands = [],

  embedded = false,
  showFiltersInEmbedded = false,
  hideCreateAndBulkActions = false,
  hideAssignBy = false,

  // NEW PROPS
  advancedFilters,
  onAdvancedFilterChange,
  onOpenEditModal,
  getBrandsByCompany,
}) => {
  useEffect(() => {
    const handleTaskUpdated = (event: any) => {
      const updatedTask = event.detail.task;
      if (!updatedTask || !updatedTask.id) return;

      // Since tasks are passed as props from DashboardPage, 
      // they should already be updated in the parent state by the socket handler.
      // We can use this listener to trigger any local refresh or side effects if needed.
      console.log('Real-time task update received in AllTasksPage:', updatedTask.id);
    };

    window.addEventListener('taskUpdated', handleTaskUpdated);
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdated);
    };
  }, []);

  const [pageLoading, setPageLoading] = useState(true);

  const [companyKeys, setCompanyKeys] = useState<string[]>([]);
  // MD Impex - top-level allowed brands for filters (so AdvancedFilters shows them)
  const [mdImpexAllowedBrands, setMdImpexAllowedBrands] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const role = String((currentUser as any)?.role || '').toLowerCase();
        const needsAllowedCompanies = role === 'md_manager' || role === 'manager' || role === 'marketer_manager' || role === 'assistant' || role === 'ob_manager';
        const res = needsAllowedCompanies
          ? await companyService.getAllowedCompanies()
          : await companyService.getCompanies();
        const list = Array.isArray(res?.data) ? res.data : [];
        const keys = list
          .map((c: any) => (c?.name || c?.companyName || '').toString().trim().toLowerCase())
          .filter(Boolean);
        if (!cancelled) setCompanyKeys(Array.from(new Set(keys)).sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setCompanyKeys([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Derive dynamic company-brand map and options
  const COMPANY_BRAND_MAP = useMemo(() => {
    const map: Record<string, string[]> = {};

    (companyKeys || []).forEach((key) => {
      const k = (key || '').toString().trim().toLowerCase();
      if (!k) return;
      if (!map[k]) map[k] = [];
    });

    (brands || []).forEach((b) => {
      const companyKey = (b.company || '').toString().trim().toLowerCase();
      if (!companyKey) return;
      if (!map[companyKey]) map[companyKey] = [];
      if (!map[companyKey].includes(b.name)) {
        map[companyKey].push(b.name);
      }
    });

    // Include MD Impex allowed brands (from access records) so they appear
    // in dashboard filters and bulk importer even when not present in brands list.
    try {
      if (Array.isArray(mdImpexAllowedBrands) && mdImpexAllowedBrands.length > 0) {
        const mdKeyNormalized = MD_IMPEX_COMPANY_NAME.toString().trim().toLowerCase().replace(/\s+/g, '');
        // Find an existing company key that matches MD Impex (ignore spaces), else use the literal lowercased name
        const existingKey = Object.keys(map).find(k => (k || '').toString().trim().toLowerCase().replace(/\s+/g, '') === mdKeyNormalized);
        const targetKey = existingKey || MD_IMPEX_COMPANY_NAME.toString().trim().toLowerCase();
        if (!map[targetKey]) map[targetKey] = [];
        mdImpexAllowedBrands.forEach((bn) => {
          const name = String(bn || '').trim();
          if (!name) return;
          if (!map[targetKey].includes(name)) map[targetKey].push(name);
        });
      }
    } catch {
      // ignore
    }

    return map;
  }, [brands, companyKeys, mdImpexAllowedBrands, MD_IMPEX_COMPANY_NAME]);

  // State
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [deletingTasks, setDeletingTasks] = useState<string[]>([]);
  const [togglingStatusTasks, setTogglingStatusTasks] = useState<string[]>([]);
  const [approvingTasks, setApprovingTasks] = useState<string[]>([]);
  const [updatingApproval, setUpdatingApproval] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isLoading,] = useState(false);
  const [groupNumberSearch, setGroupNumberSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState<number>(DEFAULT_TASKS_PER_PAGE);

  // Use DashboardPage's filters if provided, otherwise use local state
  const [localAdvancedFilters, setLocalAdvancedFilters] = useState<AdvancedFilters>({
    status: 'all',
    priority: 'all',
    assigned: 'all',
    date: 'all',
    taskType: 'all',
    company: 'all',
    brand: 'all',
    rm: 'all',
    rmTeam: ''
  });

  const effectiveAdvancedFilters = advancedFilters || localAdvancedFilters;

  // Debug: Log when effective filters change
  useEffect(() => {
  }, [effectiveAdvancedFilters, advancedFilters, localAdvancedFilters]);
  const handleAdvancedFilterChange = useCallback((filterType: string, value: string) => {
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(filterType, value);
      return;
    }
    setLocalAdvancedFilters(prev => {
      const newState = {
        ...prev,
        [filterType]: value
      };
      return newState;
    });
  }, [onAdvancedFilterChange]);

  // Company-Brand mapping state
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const normalizeText = useCallback((value: unknown): string => {
    return (value == null ? '' : String(value)).trim().toLowerCase();
  }, []);

  const normalizeRoleKey = useCallback((value: unknown): string => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }, []);

  const normalizeEmailValue = useCallback((value: unknown): string => {
    return normalizeText(value);
  }, [normalizeText]);

  const normalizeCompanyKey = useCallback((value: unknown): string => {
    return normalizeText(value).replace(/\s+/g, '');
  }, [normalizeText]);

  const isMdImpexUserPage = useMemo(() => {
    const roleKey = String((currentUser as any)?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (roleKey === 'marketer_manager') return true;
    const myKey = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company || '');
    const mdKey = normalizeCompanyKey(MD_IMPEX_COMPANY_NAME);
    return Boolean(myKey && mdKey && myKey === mdKey);
  }, [currentUser, normalizeCompanyKey]);

  useEffect(() => {
    let mounted = true;
    const fetchMdBrands = async () => {
      try {
        if (!isMdImpexUserPage || !(currentUser as any)?.email) {
          if (mounted) setMdImpexAllowedBrands([]);
          return;
        }

        const accessRes = await mdImpexAccessService.getAllPersonAccess();
        if (!mounted) return;
        const accessList = accessRes.success && Array.isArray(accessRes.data) ? accessRes.data : [];
        const currentNormalized = String((currentUser as any)?.email || '').trim().toLowerCase();
        const myAccess = accessList.find((item: any) => String(item.assignedToEmail || '').trim().toLowerCase() === currentNormalized);
        if (myAccess && Array.isArray(myAccess.allowedBrands) && myAccess.allowedBrands.length > 0) {
          setMdImpexAllowedBrands(myAccess.allowedBrands.map((b: any) => String(b || '').trim()).filter(Boolean));
        } else {
          setMdImpexAllowedBrands([]);
        }
      } catch (err) {
        console.error('❌ Failed to fetch MD Impex allowed brands:', err);
        if (mounted) setMdImpexAllowedBrands([]);
      }
    };

    void fetchMdBrands();
    return () => { mounted = false; };
  }, [currentUser, isMdImpexUserPage]);

  const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);

  const taskTypesFetchedAtRef = useRef<number>(0);
  const taskTypesFetchInFlightRef = useRef<Promise<void> | null>(null);
  const TASK_TYPES_TTL_MS = 60_000;
  const isSpeedEcomUser = useMemo(() => {
    const myKey = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company || '');
    const speedKey = normalizeCompanyKey(SPEED_E_COM_COMPANY_KEY);
    return Boolean(myKey && speedKey && myKey === speedKey);
  }, [currentUser, normalizeCompanyKey]);

  const formatBrandWithGroupNumber = useCallback((task: any): string => {
    const plain = String(task?.brand || '').trim();
    if (!plain) return '';

    const company = String(task?.companyName || task?.company || '').trim();
    const companyKey = normalizeCompanyKey(company);
    const speedKey = normalizeCompanyKey(SPEED_E_COM_COMPANY_KEY);
    if (companyKey !== speedKey) return plain;

    const brandId = String(task?.brandId || '').trim();
    const byId = brandId
      ? (brands || []).find((b: any) => String(b?.id || b?._id || '').trim() === brandId)
      : undefined;

    const byNameCompany = !byId
      ? (brands || []).find((b: any) => (
        normalizeText(b?.name) === normalizeText(plain) &&
        normalizeCompanyKey(b?.company) === companyKey
      ))
      : undefined;

    const brandDoc: any = byId || byNameCompany;
    const displayName = String(brandDoc?.name || plain).trim() || plain;
    const groupNumber = String(brandDoc?.groupNumber || '').trim();
    return groupNumber ? `${groupNumber} - ${displayName}` : displayName;
  }, [brands, normalizeCompanyKey, normalizeText]);

  const getBrandLabelForFilter = useCallback((brandName: string): string => {
    const plain = String(brandName || '').trim();
    if (!plain) return '';

    const speedKey = normalizeCompanyKey(SPEED_E_COM_COMPANY_KEY);
    const selectedCompanyKey = normalizeCompanyKey(effectiveAdvancedFilters.company);
    if (selectedCompanyKey && selectedCompanyKey !== 'all' && selectedCompanyKey !== speedKey) return '';

    const speedBrand = (brands || []).find((b: any) => (
      normalizeCompanyKey(b?.company) === speedKey &&
      normalizeText(b?.name) === normalizeText(plain)
    ));

    const groupNumber = String((speedBrand as any)?.groupNumber || '').trim();
    const displayName = String((speedBrand as any)?.name || plain).trim() || plain;
    return groupNumber ? `${groupNumber} - ${displayName}` : '';
  }, [brands, effectiveAdvancedFilters.company, normalizeCompanyKey, normalizeText]);

  const restrictTaskTypesForCompany = useCallback((companyName: unknown, list: string[]): string[] => {
    const companyKey = normalizeText(companyName);
    if (companyKey === SPEED_E_COM_COMPANY_KEY) {
      if (Array.isArray(list) && list.length > 0) return list;
      return [...SPEED_E_COM_FIXED_TASK_TYPES];
    }

    const currentUserCompanyKey = normalizeText((currentUser as any)?.companyName || (currentUser as any)?.company);
    if (!companyKey && currentUserCompanyKey === SPEED_E_COM_COMPANY_KEY) return [...SPEED_E_COM_FIXED_TASK_TYPES];
    if (companyKey === 'all' && currentUserCompanyKey === SPEED_E_COM_COMPANY_KEY) return [...SPEED_E_COM_FIXED_TASK_TYPES];

    return list;
  }, [currentUser, normalizeText]);

  const [userMappings, setUserMappings] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    if (role !== 'sbm' && role !== 'rm' && role !== 'am' && role !== 'ar') {
      setUserMappings([]);
      return;
    }

    const selectedCompany = (effectiveAdvancedFilters.company || '').toString().trim();
    const fallbackCompany = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
    const companyName = selectedCompany && selectedCompany !== 'all' ? selectedCompany : fallbackCompany;
    if (!companyName) {
      setUserMappings([]);
      return;
    }

    const myEmail = normalizeEmailValue(currentUser?.email);
    const byEmail = (users || []).find((u: any) => normalizeEmailValue(u?.email) === myEmail);
    const userId = (byEmail?.id || byEmail?._id || (currentUser as any)?.id || (currentUser as any)?._id || '').toString();
    if (!userId) {
      setUserMappings([]);
      return;
    }

    (async () => {
      try {
        const res = await assignService.getUserMappings({ companyName, userId });
        const next = res?.success && Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setUserMappings(next);
      } catch {
        if (!cancelled) setUserMappings([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, effectiveAdvancedFilters.company, normalizeEmailValue, users]);

  const [taskTypeCompanyOverrides, setTaskTypeCompanyOverrides] = useState<Record<string, string[]>>({});

  const refreshTaskTypeCompanyOverrides = useCallback(async () => {
    try {
      const res = await companyTaskTypeService.getAllCompanyTaskTypes();
      if (res?.success && Array.isArray(res.data)) {
        const next: Record<string, string[]> = {};
        (res.data || []).forEach((row: any) => {
          const key = normalizeText(row?.companyName);
          if (!key) return;
          const names = (row?.taskTypes || [])
            .map((t: any) => (t?.name || '').toString().trim())
            .filter(Boolean);
          if (names.length > 0) next[key] = names;
        });
        setTaskTypeCompanyOverrides(next);
      } else {
        setTaskTypeCompanyOverrides({});
      }
    } catch {
      setTaskTypeCompanyOverrides({});
    }
  }, [normalizeText]);

  const allowedTaskTypeKeysForManager = useMemo(() => {
    const myEmail = (currentUser?.email || '').toString().trim().toLowerCase();
    const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString().trim();

    const normalizeKey = (v: unknown) => (v || '').toString().trim().toLowerCase();
    const normalizeRoleKey = (v: unknown) => String(v || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    const collectFrom = (value: any, out: string[]) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (!item) return;
          if (typeof item === 'string') {
            out.push(item);
            return;
          }
          if (typeof item === 'object') {
            const raw =
              (item as any)?.name ??
              (item as any)?.label ??
              (item as any)?.taskType ??
              (item as any)?.type ??
              (item as any)?.key;
            const str = (raw || '').toString().trim();
            if (str) out.push(str);
          }
        });
        return;
      }
      if (typeof value === 'string') {
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => out.push(s));
        return;
      }
      if (typeof value === 'object') {
        Object.values(value).forEach((v) => collectFrom(v, out));
      }
    };

    const directValues: string[] = [];
    [
      (currentUser as any)?.assignedTaskTypes,
      (currentUser as any)?.assignedTaskTypeNames,
      (currentUser as any)?.assignedTaskTypeKeys,
      (currentUser as any)?.allowedTaskTypes,
      (currentUser as any)?.taskTypes,
      (currentUser as any)?.taskTypeKeys,
      (currentUser as any)?.taskTypeAssignments,
      (currentUser as any)?.taskTypeAccess,
    ].forEach((v) => collectFrom(v, directValues));

    const directKeys = new Set(directValues.map(normalizeKey).filter(Boolean));
    if (directKeys.size > 0) return directKeys;

    const resolveUserRole = (candidate: any): string => {
      const raw = (candidate || '').toString().trim();
      if (!raw) return '';
      const found = (users || []).find((u: any) => {
        const id = (u?.id || u?._id || '').toString();
        const email = (u?.email || '').toString();
        return id === raw || email.toLowerCase() === raw.toLowerCase();
      });
      return (found?.role || '').toString().trim().toLowerCase();
    };

    const getAssignerRole = (t: any): string => {
      const assignedByUser = t?.assignedByUser;
      const assignedBy = t?.assignedBy;
      const direct = normalizeRoleKey(assignedByUser?.role || assignedBy?.role || '');
      if (direct) return direct;
      const rawIdOrEmail =
        (typeof assignedBy === 'string' ? assignedBy : assignedBy?._id || assignedBy?.id || assignedBy?.email) ||
        (typeof assignedByUser === 'string' ? assignedByUser : assignedByUser?._id || assignedByUser?.id || assignedByUser?.email) ||
        '';
      return normalizeRoleKey(resolveUserRole(rawIdOrEmail));
    };

    const isAssignedToMe = (t: any) => {
      const assignedTo = t?.assignedTo;
      const assignedToUser = t?.assignedToUser;
      const assignedToId =
        (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
        (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
        '';
      const assignedToEmail =
        (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
        (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
        '';

      if (myId && assignedToId && assignedToId.toString().trim() === myId) return true;
      if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
      return false;
    };

    const allowed = new Set<string>();
    (tasks || []).forEach((t: any) => {
      if (!isAssignedToMe(t)) return;
      const assignerRole = getAssignerRole(t);
      if (assignerRole !== 'md_manager' && assignerRole !== 'ob_manager') return;
      const key = normalizeKey(t?.taskType || t?.type || '');
      if (key) allowed.add(key);
    });
    if (allowed.size === 0) {
      return new Set<string>(['other work', 'trubbleshot', 'troubleshoot']);
    }
    return allowed;
  }, [currentUser, tasks, users]);

  const assistantManagerEmail = useMemo(() => {
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    if (role !== 'assistant') return '';
    const managerId = ((currentUser as any)?.managerId || '').toString();
    if (!managerId) return '';
    const manager = (users || []).find((u: any) => {
      const id = (u?.id || u?._id || '').toString();
      return id && id === managerId;
    });
    return (manager?.email || '').toString().trim().toLowerCase();
  }, [currentUser, users]);

  const assistantScopedTasks = useMemo(() => {
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    if (role !== 'assistant') return [] as any[];

    const myEmail = (currentUser?.email || '').toString().trim().toLowerCase();
    const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString().trim().toLowerCase();

    const isMine = (t: any) => {
      const assignedTo = t?.assignedTo;
      const assignedToUser = t?.assignedToUser;
      const assignedToId =
        (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
        (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
        '';
      const assignedToEmail =
        (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
        (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
        '';

      if (myId && assignedToId && assignedToId.toString().trim().toLowerCase() === myId) return true;
      if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
      return false;
    };

    const normalizeAssignerEmail = (t: any) => {
      const assignedBy = t?.assignedBy;
      const assignedByUser = t?.assignedByUser;
      const email =
        (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
        (typeof assignedByUser === 'string' && assignedByUser.includes('@') ? assignedByUser : assignedByUser?.email) ||
        (typeof assignedBy === 'string' ? assignedBy : '') ||
        '';
      return (email || '').toString().trim().toLowerCase();
    };

    return (tasks || []).filter((t: any) => {
      if (!isMine(t)) return false;
      if (!assistantManagerEmail) return true;
      const assignerEmail = normalizeAssignerEmail(t);
      return Boolean(assignerEmail && assignerEmail === assistantManagerEmail);
    });
  }, [assistantManagerEmail, currentUser, tasks]);

  const availableTaskTypes = useMemo(() => {
    const normalizeLabel = (v: unknown) => (v || '').toString().trim();
    const normalizeKey = (v: unknown) => normalizeLabel(v).toLowerCase();

    const apiLabels = (taskTypes || [])
      .map(t => normalizeLabel(t?.name))
      .filter(Boolean);

    const apiLabelByKey = new Map<string, string>();
    apiLabels.forEach(label => {
      const key = normalizeKey(label);
      if (!key) return;
      if (!apiLabelByKey.has(key)) apiLabelByKey.set(key, label);
    });

    const role = (currentUser?.role || '').toString().toLowerCase();
    if (role === 'assistant' || role === 'md_manager' || role === 'ob_manager') {
      const myEmail = (currentUser?.email || '').toString().trim().toLowerCase();
      const myId = ((currentUser as any)?.id || (currentUser as any)?._id || '').toString().trim();

      const isMine = (t: any) => {
        if (role === 'md_manager' || role === 'ob_manager') {
          const assignedTo = t?.assignedTo;
          const assignedToUser = t?.assignedToUser;
          const assignedBy = t?.assignedBy;
          const assignedByUser = t?.assignedByUser;

          const assignedToId =
            (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
            (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
            '';
          const assignedToEmail =
            (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
            (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
            '';

          const assignedById =
            (typeof assignedBy === 'string' ? assignedBy : assignedBy?._id || assignedBy?.id) ||
            (typeof assignedByUser === 'string' ? assignedByUser : assignedByUser?._id || assignedByUser?.id) ||
            '';
          const assignedByEmail =
            (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
            (typeof assignedByUser === 'string' && assignedByUser.includes('@') ? assignedByUser : assignedByUser?.email) ||
            '';

          if (myId && assignedToId && assignedToId.toString().trim() === myId) return true;
          if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
          if (myId && assignedById && assignedById.toString().trim() === myId) return true;
          if (myEmail && assignedByEmail && assignedByEmail.toString().trim().toLowerCase() === myEmail) return true;
          return false;
        }

        const assignedTo = t?.assignedTo;
        const assignedToUser = t?.assignedToUser;
        const assignedToId =
          (typeof assignedTo === 'string' ? assignedTo : assignedTo?._id || assignedTo?.id) ||
          (typeof assignedToUser === 'string' ? assignedToUser : assignedToUser?._id || assignedToUser?.id) ||
          '';
        const assignedToEmail =
          (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
          (typeof assignedToUser === 'string' && assignedToUser.includes('@') ? assignedToUser : assignedToUser?.email) ||
          '';

        if (myId && assignedToId && assignedToId.toString().trim() === myId) return true;
        if (myEmail && assignedToEmail && assignedToEmail.toString().trim().toLowerCase() === myEmail) return true;
        return false;
      };

      const taskLabelByKey = new Map<string, string>();
      (tasks || []).forEach((t: any) => {
        if (!isMine(t)) return;
        const label = normalizeLabel(t?.taskType || t?.type || '');
        const key = normalizeKey(label);
        if (!key) return;
        if (!taskLabelByKey.has(key)) taskLabelByKey.set(key, label);
      });

      const mergedLabelByKey = new Map<string, string>(apiLabelByKey);
      taskLabelByKey.forEach((label, key) => {
        if (!mergedLabelByKey.has(key)) mergedLabelByKey.set(key, label);
      });

      const labels = Array.from(mergedLabelByKey.values()).filter(Boolean);
      return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
    }

    if (role === 'manager' || role === 'marketer_manager') {
      const managerDefaultTypeLabels = ['Other Work', 'Trubbleshot'];
      const allowedKeys = allowedTaskTypeKeysForManager;
      const mergedLabelByKey = new Map<string, string>();
      apiLabelByKey.forEach((label, key) => {
        if (allowedKeys.has(key)) mergedLabelByKey.set(key, label);
      });
      (tasks || []).forEach((t: any) => {
        const label = normalizeLabel(t?.taskType || t?.type || '');
        const key = normalizeKey(label);
        if (!key) return;
        if (!allowedKeys.has(key)) return;
        if (!mergedLabelByKey.has(key)) mergedLabelByKey.set(key, label);
      });

      const labels = Array.from(mergedLabelByKey.values()).filter(Boolean);
      return [...new Set([...labels, ...managerDefaultTypeLabels])].sort((a, b) => a.localeCompare(b));
    }

    return [...new Set(apiLabels)].sort((a, b) => a.localeCompare(b));
  }, [allowedTaskTypeKeysForManager, currentUser, taskTypes, tasks]);

  const uniqueLabelsByKey = useCallback((items: string[]): string[] => {
    const map = new Map<string, string>();
    (items || []).forEach((raw) => {
      const label = (raw || '').toString().trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (!map.has(key)) map.set(key, label);
    });
    return Array.from(map.values());
  }, []);

  const taskTypesByCompanyFromTasks = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (tasks || []).forEach((t: any) => {
      const company = normalizeText(t?.companyName || t?.company);
      const type = (t?.taskType || t?.type || '').toString().trim();
      if (!company || !type) return;
      if (!map.has(company)) map.set(company, new Set<string>());
      map.get(company)!.add(type);
    });
    return map;
  }, [tasks, normalizeText]);

  const getTaskTypesForCompany = useCallback((companyName: string): string[] => {
    const companyKey = normalizeText(companyName);
    if (!companyKey) return [];
    const fromTasks = Array.from(taskTypesByCompanyFromTasks.get(companyKey) || []);
    const fromOverrides = Array.isArray(taskTypeCompanyOverrides?.[companyKey]) ? taskTypeCompanyOverrides[companyKey] : [];
    const role = (currentUser?.role || '').toString().toLowerCase();
    const mappingCompanyKey = normalizeCompanyKey(companyName);
    const taskTypeNameById = new Map(
      (taskTypes || []).map((t: any) => [String(t?._id || t?.id || ''), String(t?.name || '').trim()])
    );
    const fromMappings = (role === 'sbm' || role === 'rm' || role === 'am' || role === 'ar')
      ? (userMappings || [])
        .filter((m: any) => normalizeCompanyKey(m?.companyName) === mappingCompanyKey)
        .flatMap((m: any) => {
          if (Array.isArray(m?.taskTypes) && m.taskTypes.length > 0) {
            return m.taskTypes.map((t: any) => (t?.name || '').toString().trim());
          }
          if (Array.isArray(m?.taskTypeIds) && m.taskTypeIds.length > 0) {
            return m.taskTypeIds
              .map((id: any) => taskTypeNameById.get(String(id)) || '')
              .filter(Boolean);
          }
          return [];
        })
        .filter(Boolean)
      : [];

    const merged = uniqueLabelsByKey(Array.from(new Set([...fromOverrides, ...fromTasks, ...fromMappings])));

    if (role === 'manager' || role === 'marketer_manager') {
      const managerDefaultTypeLabels = ['Other Work', 'Troubleshoot'];
      const mergedWithDefaults = uniqueLabelsByKey(Array.from(new Set([...merged, ...managerDefaultTypeLabels])));
      const allowedKeys = allowedTaskTypeKeysForManager;
      return restrictTaskTypesForCompany(companyName, mergedWithDefaults
        .filter((t) => allowedKeys.has((t || '').toString().trim().toLowerCase()))
        .sort((a, b) => a.localeCompare(b)));
    }

    return restrictTaskTypesForCompany(companyName, merged.sort((a, b) => a.localeCompare(b)));
  }, [allowedTaskTypeKeysForManager, currentUser?.role, normalizeText, restrictTaskTypesForCompany, taskTypeCompanyOverrides, taskTypes, taskTypesByCompanyFromTasks, uniqueLabelsByKey, userMappings]);

  const availableTaskTypesForFilters = useMemo(() => {
    const roleKey = normalizeRoleKey(currentUser?.role);

    if (roleKey === 'manager' || roleKey === 'md_manager' || roleKey === 'ob_manager') {
      const fixed = ['Other Work', 'Troubleshoot', 'Regular', 'goggle']
        .map((x) => (x || '').toString().trim())
        .filter(Boolean);
      const uniqueByKey = new Map<string, string>();
      fixed.forEach((label) => {
        const key = label.toLowerCase();
        if (!uniqueByKey.has(key)) uniqueByKey.set(key, label);
      });
      return Array.from(uniqueByKey.values()).sort((a, b) => a.localeCompare(b));
    }

    if (roleKey === 'assistant') {
      const companyKey = normalizeText(effectiveAdvancedFilters.company);
      const taskTypesFromTasks = (assistantScopedTasks || [])
        .filter((t: any) => {
          if (companyKey === 'all') return true;
          const taskCompany = normalizeText(t?.companyName || t?.company);
          return taskCompany === companyKey;
        })
        .map((t: any) => (t?.taskType || t?.type || '').toString().trim())
        .filter(Boolean);

      const fromOverrides = companyKey && companyKey !== 'all'
        ? (Array.isArray(taskTypeCompanyOverrides?.[companyKey]) ? taskTypeCompanyOverrides[companyKey] : [])
        : Object.values(taskTypeCompanyOverrides || {}).flatMap((arr) => (Array.isArray(arr) ? arr : []));

      const merged = uniqueLabelsByKey(Array.from(new Set([...(taskTypesFromTasks || []), ...(fromOverrides || [])])));
      return restrictTaskTypesForCompany(effectiveAdvancedFilters.company, merged.sort((a, b) => a.localeCompare(b)));
    }

    if (effectiveAdvancedFilters.company !== 'all') {
      return getTaskTypesForCompany(effectiveAdvancedFilters.company);
    }

    const fromOverrides = Object.values(taskTypeCompanyOverrides || {}).flatMap((arr) => (Array.isArray(arr) ? arr : []));
    const fromTasks = Array.from(taskTypesByCompanyFromTasks.values()).flatMap((set) => Array.from(set));
    const merged = uniqueLabelsByKey(Array.from(new Set([...availableTaskTypes, ...fromOverrides, ...fromTasks])));

    if (roleKey === 'manager' || roleKey === 'marketer_manager') {
      const allowedKeys = allowedTaskTypeKeysForManager;
      return restrictTaskTypesForCompany(effectiveAdvancedFilters.company, merged
        .filter((t) => allowedKeys.has((t || '').toString().trim().toLowerCase()))
        .sort((a, b) => a.localeCompare(b)));
    }

    return restrictTaskTypesForCompany(effectiveAdvancedFilters.company, merged.sort((a, b) => a.localeCompare(b)));
  }, [allowedTaskTypeKeysForManager, assistantScopedTasks, availableTaskTypes, currentUser?.role, effectiveAdvancedFilters.company, getTaskTypesForCompany, normalizeRoleKey, normalizeText, restrictTaskTypesForCompany, taskTypeCompanyOverrides, taskTypesByCompanyFromTasks, uniqueLabelsByKey]);
  const fetchTaskTypes = useCallback(async () => {
    const isFresh = taskTypesFetchedAtRef.current && Date.now() - taskTypesFetchedAtRef.current < TASK_TYPES_TTL_MS;
    if (taskTypes.length > 0 && isFresh) return;
    if (taskTypesFetchInFlightRef.current) return taskTypesFetchInFlightRef.current;

    setPageLoading(true);

    taskTypesFetchInFlightRef.current = (async () => {
      try {
        const response = await taskTypeService.getTaskTypes();
        if (response?.success && Array.isArray(response.data)) {
          const role = (currentUser?.role || '').toLowerCase();

          if (role === 'manager' || role === 'marketer_manager') {
            const allowed = allowedTaskTypeKeysForManager;
            const filtered = (response.data as TaskTypeItem[]).filter(t => allowed.has((t?.name || '').toString().trim().toLowerCase()));
            setTaskTypes(filtered);
            taskTypesFetchedAtRef.current = Date.now();
            return;
          }

          setTaskTypes(response.data as TaskTypeItem[]);
          taskTypesFetchedAtRef.current = Date.now();
        }
      } catch (error) {
        console.error('Failed to fetch task types:', error);
      } finally {
        setPageLoading(false);
      }
    })().finally(() => {
      taskTypesFetchInFlightRef.current = null;
    });

    return taskTypesFetchInFlightRef.current;
  }, [allowedTaskTypeKeysForManager, currentUser?.role, taskTypes.length]);

  useEffect(() => {
    fetchTaskTypes();
  }, [fetchTaskTypes]);

  // Comment related states
  const [showCommentSidebar, setShowCommentSidebar] = useState(false);
  const [commentSidebarTab, setCommentSidebarTab] = useState<'details' | 'permanent-history'>('details');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [taskComments, setTaskComments] = useState<Record<string, CommentType[]>>({});

  const unreadStorageKey = useMemo(() => {
    const uid = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
    return uid ? `unread_comments:${uid}` : '';
  }, [currentUser]);

  const [unreadCommentsMap, setUnreadCommentsMap] = useState<Record<string, number>>(() => {
    try {
      if (!unreadStorageKey) return {};
      const raw = localStorage.getItem(unreadStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const persistUnreadCommentsMap = useCallback((map: Record<string, number>) => {
    try {
      if (!unreadStorageKey) return;
      localStorage.setItem(unreadStorageKey, JSON.stringify(map || {}));
    } catch {
      // ignore
    }
  }, [unreadStorageKey]);

  useEffect(() => {
    // reload from storage when user changes
    try {
      if (!unreadStorageKey) {
        setUnreadCommentsMap({});
        return;
      }
      const raw = localStorage.getItem(unreadStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setUnreadCommentsMap(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setUnreadCommentsMap({});
    }
  }, [unreadStorageKey]);

  useEffect(() => {
    const handler = (event: any) => {
      const taskId = String(event?.detail?.taskId || '').trim();
      if (!taskId) return;
      setUnreadCommentsMap((prev) => {
        const next = { ...(prev || {}) };
        next[taskId] = Date.now();
        persistUnreadCommentsMap(next);
        return next;
      });
    };
    window.addEventListener('taskCommentUnread', handler as any);
    return () => window.removeEventListener('taskCommentUnread', handler as any);
  }, [persistUnreadCommentsMap]);

  const clearUnreadForTask = useCallback((taskId: string) => {
    const id = String(taskId || '').trim();
    if (!id) return;
    setUnreadCommentsMap((prev) => {
      const next = { ...(prev || {}) };
      if (next[id]) delete next[id];
      persistUnreadCommentsMap(next);
      return next;
    });
  }, [persistUnreadCommentsMap]);

  // Task History State
  const [taskHistory, setTaskHistory] = useState<Record<string, TaskHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [taskToApprove, setTaskToApprove] = useState<Task | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [reassignComment, setReassignComment] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [showMdImpexReassignModal, setShowMdImpexReassignModal] = useState(false);
  const [mdImpexReassignTask, setMdImpexReassignTask] = useState<Task | null>(null);
  const [mdImpexAssigneeEmail, setMdImpexAssigneeEmail] = useState('');
  const [mdImpexSubmitting, setMdImpexSubmitting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  // ==================== BULK IMPORT STATE ====================
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [bulkImportDefaults, setBulkImportDefaults] = useState<BulkImportDefaults>({
    assigner: currentUser.email || '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    taskType: '',
    companyName: '',
    brand: ''
  });

  useEffect(() => {
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    if (role !== 'sbm' && role !== 'rm' && role !== 'am' && role !== 'troubleshoot_manager') return;
    setBulkImportDefaults((prev) => {
      const current = (prev?.companyName || '').toString().trim();
      if (current) return prev;
      const normalizeCompanyKeyLocal = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
      const myCompanyKey = normalizeCompanyKeyLocal((currentUser as any)?.companyName || (currentUser as any)?.company || '');
      const mdKey = normalizeCompanyKeyLocal(MD_IMPEX_COMPANY_NAME);
      if (myCompanyKey && mdKey && myCompanyKey === mdKey) return { ...prev, companyName: MD_IMPEX_COMPANY_NAME };
      if (role === 'troubleshoot_manager') return { ...prev, companyName: MD_IMPEX_COMPANY_NAME };
      const raw = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
      const normalized = raw ? raw.toLowerCase() : '';
      return { ...prev, companyName: normalized || SPEED_E_COM_COMPANY_KEY };
    });
  }, [currentUser]);
  const [bulkDraftTasks, setBulkDraftTasks] = useState<BulkTaskDraft[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkCreateSummary, setBulkCreateSummary] = useState<BulkCreateResult | null>(null);

  const availableTaskTypesForBulk = useMemo(() => {
    if (!bulkImportDefaults.companyName) return [];
    return getTaskTypesForCompany(bulkImportDefaults.companyName);
  }, [bulkImportDefaults.companyName, getTaskTypesForCompany]);

  // ==================== UTILITY FUNCTIONS ====================
  const getBrandsByCompanyInternal = useCallback((companyName: string): string[] => {
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    // If MD Impex user and we have explicit allowed brands from person-access, prefer those
    try {
      const requestedKey = normalizeCompanyKey(companyName || '');
      const mdKey = normalizeCompanyKey(MD_IMPEX_COMPANY_NAME);
      if (isMdImpexUserPage && mdImpexAllowedBrands && mdImpexAllowedBrands.length > 0) {
        // If the request is for MD Impex specifically, return only allowed brands
        if (requestedKey === mdKey) {
          return Array.from(new Set(mdImpexAllowedBrands)).sort((a, b) => a.localeCompare(b));
        }
        // If 'all' is requested and user is MD Impex, show only allowed brands
        if (!companyName || String(companyName).trim().toLowerCase() === 'all') {
          return Array.from(new Set(mdImpexAllowedBrands)).sort((a, b) => a.localeCompare(b));
        }
      }
    } catch (err) {
      // ignore
    }
    if (role === 'sbm' || role === 'rm' || role === 'am' || role === 'ar') {
      const companyKey = normalizeCompanyKey(companyName);
      const fromMappings = (userMappings || [])
        .filter((m: any) => {
          if (!companyKey || companyName === 'all') return true;
          return normalizeCompanyKey(m?.companyName) === companyKey;
        })
        .map((m: any) => (m?.brandName || '').toString().trim())
        .filter(Boolean);
      if (fromMappings.length > 0) {
        return Array.from(new Set(fromMappings)).sort((a, b) => a.localeCompare(b));
      }
    }

    if (role === 'assistant') {
      const companyKey = normalizeText(companyName);
      const items = (assistantScopedTasks || []).filter((t: any) => {
        if (!companyKey || companyKey === 'all') return true;
        const taskCompany = normalizeText(t?.companyName || t?.company);
        return taskCompany === companyKey;
      });

      const brandsFromTasks = items
        .map((t: any) => (t?.brand || '').toString().trim())
        .filter(Boolean);
      return Array.from(new Set(brandsFromTasks)).sort((a, b) => a.localeCompare(b));
    }

    if (getBrandsByCompany) {
      return getBrandsByCompany(companyName);
    }

    if (!companyName || companyName === 'all') {
      // Return all unique brands
      const allBrands = Object.values(COMPANY_BRAND_MAP).flat();
      return [...new Set(allBrands)];
    }

    return COMPANY_BRAND_MAP[companyName.toLowerCase()] || [];
  }, [COMPANY_BRAND_MAP, assistantScopedTasks, currentUser?.role, getBrandsByCompany, normalizeText, userMappings, mdImpexAllowedBrands, isMdImpexUserPage]);

  const getEmailByIdInternal = useCallback((userId: any): string => {
    if (userId && userId.includes('@')) {
      return userId;
    }

    const user = users.find(u =>
      u.id === userId ||
      u._id === userId ||
      u.email === userId
    );

    if (user) {
      return user.email || user.name || 'Unknown';
    }

    return 'Unknown';
  }, [users]);

  const getAssignerEmail = useCallback((task: Task): string => {
    if (!task.assignedBy) return 'Unknown';

    const assignedByFallback = typeof task.assignedBy === 'string'
      ? task.assignedBy
      : ((task.assignedBy as any)?.email || (task.assignedBy as any)?.name || '');

    if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
      const assignerObj = task.assignedBy as any;
      if (assignerObj.email) return assignerObj.email;
      if (assignerObj.name) return assignerObj.name;
    }

    // Try to find in users
    const creatorUser = users.find(u =>
      u.id === assignedByFallback ||
      u._id === assignedByFallback ||
      u.email === assignedByFallback
    );

    return creatorUser?.email || assignedByFallback || 'Unknown';
  }, [users]);

  const isTaskAssigner = useCallback((task: Task): boolean => {
    const assignerEmail = getAssignerEmail(task);
    const currentUserEmail = currentUser?.email;

    if (!assignerEmail || assignerEmail === 'Unknown' || !currentUserEmail) {
      return false;
    }

    return assignerEmail.toLowerCase() === currentUserEmail.toLowerCase();
  }, [getAssignerEmail, currentUser]);

  const isTaskAssignee = useCallback((task: Task): boolean => {
    const assigneeEmail = getEmailByIdInternal(task.assignedTo);
    const currentUserEmail = currentUser?.email;

    if (!assigneeEmail || assigneeEmail === 'Unknown' || !currentUserEmail) {
      return false;
    }

    return assigneeEmail.toLowerCase() === currentUserEmail.toLowerCase();
  }, [getEmailByIdInternal, currentUser]);

  const canEditTask = useCallback((task: Task): boolean => {
    const roleKey = String((currentUser as any)?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (roleKey === 'rm' || roleKey === 'am') return true;

    if (isTaskAssigner(task)) return true;

    const normalizeCompanyKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
    const isSpeedEcomTask = normalizeCompanyKey((task as any)?.companyName || (task as any)?.company) === 'speedecom';
    if (!isSpeedEcomTask) return false;

    return isTaskAssignee(task);
  }, [isTaskAssigner, isTaskAssignee]);

  const getUserInfoForDisplay = useCallback((task: Task): { name: string; email: string } => {
    if (task.assignedToUser && task.assignedToUser.email) {
      return {
        name: task.assignedToUser.name || task.assignedToUser.email.split('@')[0] || 'User',
        email: task.assignedToUser.email
      };
    }

    const assignedTo = task.assignedTo;
    if (typeof assignedTo === 'string') {
      if (assignedTo.includes('@')) {
        return {
          name: assignedTo.split('@')[0] || 'User',
          email: assignedTo
        };
      } else {
        const user = users.find(u =>
          u.id === assignedTo ||
          u._id === assignedTo ||
          u.email === assignedTo
        );

        if (user) {
          return {
            name: user.name || user.email?.split('@')[0] || 'User',
            email: user.email || 'unknown@example.com'
          };
        }

        return {
          name: 'User',
          email: assignedTo
        };
      }
    }

    return {
      name: 'Unknown User',
      email: 'unknown@example.com'
    };
  }, [users]);

  // ==================== MISSING FUNCTIONS ====================
  const fetchAndStoreTaskHistory = useCallback(async (taskId: string) => {
    if (!onFetchTaskHistory) return;

    setLoadingHistory(prev => ({ ...prev, [taskId]: true }));
    try {
      const history = await onFetchTaskHistory(taskId);
      setTaskHistory(prev => ({ ...prev, [taskId]: history }));
    } catch (error) {
      console.error('Error fetching task history:', error);
      toast.error('Failed to load task history');
    } finally {
      setLoadingHistory(prev => ({ ...prev, [taskId]: false }));
    }
  }, [onFetchTaskHistory]);

  const isTaskPermanentlyApproved = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    return Boolean(task?.completedApproval);
  }, [tasks]);

  const isTaskCompleted = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status === 'completed';
  }, [tasks]);

  const isTaskPendingApproval = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'completed') return false;
    if (isTaskPermanentlyApproved(taskId)) return false;

    return !Boolean(task.completedApproval);
  }, [tasks, isTaskPermanentlyApproved]);

  const getTaskStatusIcon = useCallback((taskId: string, isCompleted: boolean, isToggling: boolean) => {
    if (isToggling) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (isCompleted) {
      const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);

      if (isPermanentlyApproved) {
        return (
          <div className="relative" title="PERMANENTLY Approved by Assigner">
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </div>
        );
      } else {
        return <Check className="h-4 w-4 text-green-500" />;
      }
    } else {
      return <div className="h-4 w-4 border border-gray-400 rounded"></div>;
    }
  }, [isTaskPermanentlyApproved]);

  const normalizeStatusKey = useCallback((value: any): string => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(/\s+/g, '-');
  }, []);

  const getStatusBadgeColor = useCallback((taskId: string) => {
    const isCompleted = isTaskCompleted(taskId);
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isPendingApproval = isTaskPendingApproval(taskId);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      } else if (isPendingApproval) {
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      } else {
        return 'bg-green-100 text-green-800 border border-green-200';
      }
    }

    const task = tasks.find(t => t.id === taskId);
    const statusKey = normalizeStatusKey(task?.status);
    if (statusKey === 'in-progress') {
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    }
    if (statusKey === 'reassigned') {
      return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
    }

    return 'bg-gray-100 text-gray-800 border border-gray-200';
  }, [isTaskCompleted, isTaskPermanentlyApproved, isTaskPendingApproval, normalizeStatusKey, tasks]);

  const getStatusText = useCallback((taskId: string) => {
    const isCompleted = isTaskCompleted(taskId);
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isPendingApproval = isTaskPendingApproval(taskId);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return ' PERMANENTLY Approved';
      } else if (isPendingApproval) {
        return ' Pending Admin Approval';
      } else {
        return 'Approved';
      }
    }

    const task = tasks.find(t => t.id === taskId);
    const statusKey = normalizeStatusKey(task?.status);
    if (statusKey === 'in-progress') {
      return 'In Progress';
    }
    if (statusKey === 'reassigned') {
      return 'Reassigned';
    }

    return 'Pending';
  }, [isTaskCompleted, isTaskPermanentlyApproved, isTaskPendingApproval, normalizeStatusKey, tasks]);

  const getTaskCommentsInternal = useCallback((taskId: string): CommentType[] => {
    return taskComments[taskId] || [];
  }, [taskComments]);

  const getTimelineItems = useCallback((taskId: string): HistoryDisplayItem[] => {
    const items: HistoryDisplayItem[] = [];

    const isValidDate = (v: any): boolean => {
      if (!v) return false;
      const d = new Date(String(v));
      return !Number.isNaN(d.getTime());
    };

    const hiddenLegacyActions = new Set(['marked_completed', 'marked_pending', 'task_approved']);

    // Add task history from state
    if (taskHistory[taskId]) {
      taskHistory[taskId].forEach(history => {
        const action = (history as any)?.action ? String((history as any).action).trim() : '';
        const msg = ((history as any)?.message || '').toString().trim();
        const ts = ((history as any)?.timestamp || (history as any)?.createdAt || (history as any)?.updatedAt || '').toString();

        if (!action || hiddenLegacyActions.has(action)) return;
        if (!msg) return;
        if (!isValidDate(ts)) return;

        const config = HISTORY_ACTION_CONFIG[action] || HISTORY_ACTION_CONFIG.default;
        items.push({
          id: `history-${history.id}`,
          type: 'history',
          data: history,
          timestamp: ts,
          displayTime: formatDateTime(ts),
          actionType: action,
          color: config.color,
          icon: config.icon,
          label: config.label
        });
      });
    }

    // Add from task object
    const task = tasks.find(t => t.id === taskId);
    void task;

    // Add comments from state
    if (taskComments[taskId]) {
      taskComments[taskId].forEach(comment => {
        const content = ((comment as any)?.content || '').toString().trim();
        const ts = ((comment as any)?.createdAt || (comment as any)?.updatedAt || '').toString();
        if (!content) return;
        if (!isValidDate(ts)) return;

        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          data: comment,
          timestamp: ts,
          displayTime: formatDateTime(ts) || '—',
          actionType: 'comment_added',
          color: HISTORY_ACTION_CONFIG.comment_added.color,
          icon: HISTORY_ACTION_CONFIG.comment_added.icon,
          label: 'Comment Added'
        });
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [taskComments, taskHistory, tasks, formatDateTime]);

  // ==================== HISTORY TRACKING FUNCTIONS ====================
  const addHistoryRecord = useCallback(async (
    taskId: string,
    action: TaskHistory['action'],
    message: string,
    additionalData?: Record<string, any>
  ) => {
    void taskId;
    void action;
    void message;
    void additionalData;
    return;
  }, []);

  // ==================== CREATE TASK WITH HISTORY ====================
  const handleCreateTaskWithHistory = useCallback(async () => {
    try {
      // Call the original create task function
      const newTask = await onCreateTask();

      if (newTask && typeof newTask === 'object' && newTask.id) {
        toast.success('Task created successfully!');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [onCreateTask]);

  // ==================== EDIT TASK FUNCTIONS ====================
  const handleOpenEditModal = useCallback((task: Task) => {
    if (!canEditTask(task)) {
      toast.error('You do not have permission to edit this task');
      setOpenMenuId(null);
      return;
    }
    if (onOpenEditModal) {
      // Use DashboardPage's edit modal
      onOpenEditModal(task);
    } else {
      // Fallback to local edit modal (you can implement this if needed)
      console.log('Edit task:', task);
      toast.error('Edit functionality not available');
    }
    setOpenMenuId(null);
  }, [canEditTask, onOpenEditModal]);

  // ==================== BULK IMPORT FUNCTIONS ====================
  const handleOpenBulkImporter = useCallback(() => {
    setShowBulkImporter(true);
    setBulkCreateSummary(null);
    setBulkDraftTasks([]);

    // Set current user as default assigner
    setBulkImportDefaults(prev => ({
      ...prev,
      assigner: currentUser.email || '',
      dueDate: new Date().toISOString().split('T')[0],
      companyName: (() => {
        const normalizeCompanyKeyLocal = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
        const myCompanyKey = normalizeCompanyKeyLocal((currentUser as any)?.companyName || (currentUser as any)?.company || '');
        const mdKey = normalizeCompanyKeyLocal(MD_IMPEX_COMPANY_NAME);
        if (myCompanyKey && mdKey && myCompanyKey === mdKey) return MD_IMPEX_COMPANY_NAME;

        const prevCompany = (prev.companyName || '').toString().trim();
        if (prevCompany) return prevCompany;

        const roleKey = (currentUser?.role || '').toString().trim().toLowerCase();
        if (roleKey === 'troubleshoot_manager') return MD_IMPEX_COMPANY_NAME;
        if (roleKey === 'sbm' || roleKey === 'rm' || roleKey === 'am') return SPEED_E_COM_COMPANY_KEY;

        if (companyKeys.length === 1) return companyKeys[0];
        return prevCompany;
      })()
    }));
  }, [companyKeys, currentUser]);

  const handleBulkDefaultsChange = useCallback((defaults: Partial<BulkImportDefaults>) => {
    setBulkImportDefaults(prev => ({ ...prev, ...defaults }));
  }, []);

  const handleBulkDraftsChange = useCallback((drafts: BulkTaskDraft[]) => {
    setBulkDraftTasks(drafts);
  }, []);

  const handleBulkImportSubmit = useCallback(async () => {
    if (!onBulkCreateTasks) {
      toast.error('Bulk create functionality not available');
      return;
    }

    if (bulkDraftTasks.length === 0) {
      toast.error('No tasks to import');
      return;
    }

    // Validate all drafts
    const validatedDrafts = bulkDraftTasks.map(validateBulkDraft);
    const hasErrors = validatedDrafts.some(draft => draft.errors.length > 0);

    if (hasErrors) {
      setBulkDraftTasks(validatedDrafts);
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setBulkSubmitting(true);

    try {
      // Convert assigner back to assignedTo for API
      const payloads: BulkTaskPayload[] = validatedDrafts.map(draft => ({
        title: draft.title,
        assignedTo: draft.assigner, // Map assigner to assignedTo
        dueDate: draft.dueDate,
        priority: (draft.priority || bulkImportDefaults.priority) as BulkPriority,
        taskType: (draft.taskType || bulkImportDefaults.taskType) || undefined,
        companyName: (() => {
          const normalizeCompanyKeyLocal = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');
          const myCompanyKey = normalizeCompanyKeyLocal((currentUser as any)?.companyName || (currentUser as any)?.company || '');
          const mdKey = normalizeCompanyKeyLocal(MD_IMPEX_COMPANY_NAME);
          if (myCompanyKey && mdKey && myCompanyKey === mdKey) return MD_IMPEX_COMPANY_NAME;
          return draft.companyName || bulkImportDefaults.companyName;
        })(),
        brand: draft.brand || bulkImportDefaults.brand,
        rowNumber: draft.rowNumber
      }));

      const result = await onBulkCreateTasks(payloads);
      setBulkCreateSummary(result);

      if (result.failures.length === 0) {
        toast.success(` Successfully created ${result.created.length} tasks`);

        // Add history for each created task
        for (const task of result.created) {
          try {
            await addHistoryRecord(
              task.id,
              'task_created',
              `Task created in bulk import by ${currentUser.role} (${currentUser.name})`,
              {
                bulkImport: true,
                createdBy: currentUser.email,
                createdAt: new Date().toISOString()
              }
            );
          } catch (error) {
            console.error('Error adding history for bulk task:', error);
          }
        }

        setShowBulkImporter(false);
        setBulkDraftTasks([]);
      } else {
        toast.success(` Created ${result.created.length} tasks, ${result.failures.length} failed`);

        // Add history for successfully created tasks
        for (const task of result.created) {
          try {
            await addHistoryRecord(
              task.id,
              'task_created',
              `Task created in bulk import by ${currentUser.role} (${currentUser.name})`,
              {
                bulkImport: true,
                createdBy: currentUser.email,
                createdAt: new Date().toISOString()
              }
            );
          } catch (error) {
            console.error('Error adding history for bulk task:', error);
          }
        }

        // Keep only failed tasks in drafts for retry
        const failedDrafts = validatedDrafts.filter(draft =>
          result.failures.some(failure => failure.rowNumber === draft.rowNumber)
        );
        setBulkDraftTasks(failedDrafts);
      }
    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast.error(`❌ Failed to create tasks: ${error.message || 'Unknown error'}`);
    } finally {
      setBulkSubmitting(false);
    }
  }, [bulkDraftTasks, bulkImportDefaults, onBulkCreateTasks, addHistoryRecord, currentUser]);

  // ==================== EVENT HANDLERS ====================
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    if (filterType === 'company') {
      void refreshTaskTypeCompanyOverrides();
      handleAdvancedFilterChange(filterType, value);
      handleAdvancedFilterChange('brand', 'all');
      handleAdvancedFilterChange('taskType', 'all');

      const brands = getBrandsByCompanyInternal(value);
      setAvailableBrands(brands);
    } else {
      handleAdvancedFilterChange(filterType as keyof AdvancedFilters, value);
    }
  }, [currentUser?.role, getBrandsByCompanyInternal, handleAdvancedFilterChange, refreshTaskTypeCompanyOverrides]);

  const applyAdvancedFilters = useCallback(() => {
    // Get the current filter values
    const currentFilters = effectiveAdvancedFilters;

    // Keep legacy single-select UI state in sync.
    // For multi-select values, we fall back to 'all' and rely on advanced filters logic below.
    const statusSet = parseMultiValue(currentFilters.status);
    setFilter(statusSet.length === 1 ? statusSet[0] : 'all');

    const assignedSet = parseMultiValue(currentFilters.assigned);
    if (setAssignedFilter) setAssignedFilter(assignedSet.length === 1 ? assignedSet[0] : 'all');

    const dateSet = parseMultiValue(currentFilters.date);
    setDateFilter(dateSet.length === 1 ? dateSet[0] : 'all');

    // Close the filters panel
    setShowAdvancedFilters(false);

    // Show success message
    toast.success('Filters applied successfully');
  }, [effectiveAdvancedFilters, setFilter, setAssignedFilter, setDateFilter]);

  const resetFilters = useCallback(() => {
    const emptyFilters = {
      status: 'all',
      priority: 'all',
      assigned: 'all',
      date: 'all',
      taskType: 'all',
      company: 'all',
      brand: 'all',
      rm: 'all',
      rmTeam: ''
    };

    // Reset both local and DashboardPage filters
    if (onAdvancedFilterChange) {
      Object.keys(emptyFilters).forEach(key => {
        onAdvancedFilterChange(key, emptyFilters[key as keyof typeof emptyFilters]);
      });
    } else {
      setLocalAdvancedFilters(emptyFilters);
    }

    setAvailableBrands(getBrandsByCompanyInternal('all'));
    setFilter('all');
    setDateFilter('all');
    if (setAssignedFilter) setAssignedFilter('all');
    setSearchTerm('');
    setGroupNumberSearch('');

    setShowAdvancedFilters(false);
    toast.success('All filters cleared');
  }, [setFilter, setAssignedFilter, setDateFilter, setSearchTerm, onAdvancedFilterChange, getBrandsByCompanyInternal]);

  const availableRmUsersForFilters = useMemo(() => {
    const roleKey = normalizeRoleKey(currentUser?.role);
    if (roleKey !== 'sbm') return [] as UserType[];

    const selectedCompanyKey = normalizeCompanyKey(effectiveAdvancedFilters.company);
    const fallbackCompanyKey = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company);
    const companyKeyForRms = selectedCompanyKey && selectedCompanyKey !== 'all' ? selectedCompanyKey : fallbackCompanyKey;

    return (users || [])
      .filter((u: any) => normalizeRoleKey(u?.role) === 'rm')
      .filter((u: any) => {
        if (!companyKeyForRms) return true;
        const uCompanyKey = normalizeCompanyKey(u?.companyName || u?.company);
        return Boolean(uCompanyKey && uCompanyKey === companyKeyForRms);
      })
      .sort((a: any, b: any) => String(a?.name || a?.email || '').localeCompare(String(b?.name || b?.email || '')));
  }, [currentUser, effectiveAdvancedFilters.company, normalizeCompanyKey, normalizeRoleKey, users]);

  const handleBulkStatusChange = useCallback(async (status: 'completed' | 'pending') => {
    if (!onToggleTaskStatus) return;
    if (!selectedTasks.length) {
      toast.error('No tasks selected');
      return;
    }
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    const isObManager = role === 'ob_manager';
    if (isObManager) {
      // For ob_manager, we check if they are either assignee or assigner for each task in the loop below
    }

    const confirmMessage = status === 'completed'
      ? `Mark ${selectedTasks.length} tasks as completed?`
      : `Mark ${selectedTasks.length} tasks as pending?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const desiredStatus = status;
      const currentStatusForToggle = desiredStatus === 'completed' ? 'pending' : 'completed';
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const isAssignee = isTaskAssignee(task);
          const isAssigner = isTaskAssigner(task);
          const isObManager = (currentUser?.role || '').toString().trim().toLowerCase() === 'ob_manager';

          if (!isAssignee && !(isObManager && isAssigner)) {
            toast.error(`You can only change status for tasks assigned to you${isObManager ? ' or by you' : ''}`);
            continue;
          }
          await onToggleTaskStatus(taskId, currentStatusForToggle, false);
          await addHistoryRecord(
            taskId,
            status === 'completed' ? 'bulk_completed' : 'bulk_pending',
            `Bulk updated status to ${status} by ${currentUser.role} (${currentUser.name})`,
            {
              bulkOperation: true,
              affectedTasks: selectedTasks.length
            }
          );
        }
      }

      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks marked as ${status}`);
    } catch (error) {
      console.error('Error in bulk status change:', error);
      toast.error('Failed to update tasks');
    }
  }, [addHistoryRecord, currentUser, isTaskAssignee, onToggleTaskStatus, selectedTasks, tasks]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTasks.length === 0) return;

    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    const isObManager = role === 'ob_manager';

    if (!window.confirm(`Delete ${selectedTasks.length} tasks? This action cannot be undone.`)) return;

    setBulkDeleting(true);
    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const isAssigner = isTaskAssigner(task);

          if (isObManager && !isAssigner) {
            toast.error(`You do not have permission to delete task: ${task.title}`);
            continue;
          }
          await addHistoryRecord(
            taskId,
            'task_deleted',
            `Task deleted by ${currentUser.role} (${currentUser.name})`,
            { deletedAt: new Date().toISOString(), deletedBy: currentUser.email }
          );
        }
        await onDeleteTask(taskId);
      }
      setSelectedTasks([]);
      toast.success('Tasks deleted successfully');
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('Failed to delete selected tasks');
    } finally {
      setBulkDeleting(false);
    }
  }, [addHistoryRecord, currentUser, onDeleteTask, selectedTasks, tasks]);

  const handlePermanentApproval = useCallback(async (taskId: string, value: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      toast.error("Task not found");
      return;
    }

    if (!isTaskAssigner(task)) {
      toast.error("Only the task assigner can permanently approve tasks");
      return;
    }

    if (!isTaskCompleted(taskId)) {
      toast.error("Task must be completed first before permanent approval");
      return;
    }

    setUpdatingApproval(prev => [...prev, taskId]);

    try {
      if (onUpdateTaskApproval) {
        await onUpdateTaskApproval(taskId, value);
      } else {
        toast.error("Update function not available");
        return;
      }

      if (value) {
        await addHistoryRecord(
          taskId,
          'assigner_permanent_approved',
          `Task PERMANENTLY approved by Assigner (${currentUser.name})`,
          { permanentApproval: true, approvedAt: new Date().toISOString() }
        );
        toast.success(" Task PERMANENTLY approved!");
      } else {
        await addHistoryRecord(
          taskId,
          'permanent_approval_removed',
          `Permanent approval REMOVED by Assigner (${currentUser.name})`,
          { permanentApproval: false, removedAt: new Date().toISOString() }
        );
        toast.success("Permanent approval removed!");
      }

      setOpenMenuId(null);
    } catch (error) {
      console.error('Error updating permanent approval:', error);
      toast.error("Failed to update approval status");
    } finally {
      setUpdatingApproval(prev => prev.filter(id => id !== taskId));
    }
  }, [tasks, isTaskAssigner, isTaskCompleted, onUpdateTaskApproval, addHistoryRecord, currentUser]);

  const handleToggleTaskStatus = useCallback(async (taskId: string, originalTask: Task) => {
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isAssignee = isTaskAssignee(originalTask);
    const isAssigner = isTaskAssigner(originalTask);

    if (isPermanentlyApproved && isAssignee && !isAssigner) {
      toast.error("This task has been PERMANENTLY approved by assigner and cannot be changed.");
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTogglingStatusTasks(prev => [...prev, taskId]);

    try {
      const isCompleted = isTaskCompleted(taskId);

      if (isCompleted) {
        await onToggleTaskStatus(taskId, 'completed', false);

        await addHistoryRecord(
          taskId,
          'marked_pending',
          `Task marked as PENDING by ${isAssigner ? 'Assigner' : 'Assignee'} (${currentUser.name})`,
          {
            previousStatus: 'completed',
            newStatus: 'pending',
            changedBy: currentUser.role
          }
        );

        toast.success('Task marked as pending');
      } else {
        await onToggleTaskStatus(taskId, task.status, false);

        await addHistoryRecord(
          taskId,
          'marked_completed',
          `Task marked as COMPLETED by ${isAssigner ? 'Assigner' : 'Assignee'} (${currentUser.name})`,
          {
            previousStatus: 'pending',
            newStatus: 'completed',
            changedBy: currentUser.role,
            needsAdminApproval: !isAssigner
          }
        );

        toast.success(' Task marked as completed! Waiting for admin approval.');
      }
    } catch (error) {
      console.error('Error toggling task status:', error);
      toast.error('Failed to update task status');
    } finally {
      try {
        if (onFetchTaskHistory) {
          await fetchAndStoreTaskHistory(taskId);
        }
      } catch {
        // ignore
      }
      setTogglingStatusTasks(prev => prev.filter(id => id !== taskId));
    }
  }, [isTaskPermanentlyApproved, isTaskAssignee, isTaskAssigner, tasks, isTaskCompleted, onToggleTaskStatus, addHistoryRecord, currentUser, onFetchTaskHistory, fetchAndStoreTaskHistory]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const normalizeEmailSafe = (v: unknown): string => (v == null ? '' : String(v)).trim().toLowerCase();
    const myEmail = normalizeEmailSafe((currentUser as any)?.email);
    const assignedByEmail = normalizeEmailSafe((task as any)?.assignedBy) || normalizeEmailSafe((task as any)?.assignedByUser?.email);
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isCreator = Boolean(myEmail && assignedByEmail && myEmail === assignedByEmail);
    if (role === 'rm' || role === 'am') {
      toast.error('You do not have permission to delete tasks');
      return;
    }

    if (!isAdmin && !isCreator) {
      toast.error('Only the task creator can delete this task');
      return;
    }

    try {
      await addHistoryRecord(
        taskId,
        'task_deleted',
        `Task deleted by ${currentUser.role} (${currentUser.name})`,
        {
          taskTitle: task.title,
          deletedAt: new Date().toISOString(),
          deletedBy: currentUser.email
        }
      );
    } catch (error) {
      console.error('Error adding delete history:', error);
    }

    setDeletingTasks(prev => [...prev, taskId]);
    try {
      await onDeleteTask(taskId);
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeletingTasks(prev => prev.filter(id => id !== taskId));
    }
  }, [tasks, addHistoryRecord, currentUser, onDeleteTask]);

  const handleOpenCommentSidebar = useCallback(async (task: Task) => {
    if (!task || !task.id) {
      toast.error("Invalid task selected");
      return;
    }

    setSelectedTask(task);
    setShowCommentSidebar(true);
    setCommentSidebarTab('permanent-history'); // Auto-open Timeline tab when clicking comment

    clearUnreadForTask(task.id);

    // Load task history
    if (onFetchTaskHistory) {
      await fetchAndStoreTaskHistory(task.id);
    }

    if (onFetchTaskComments) {
      setLoadingComments(true);
      try {
        const comments = await onFetchTaskComments(task.id);
        setTaskComments(prev => ({
          ...prev,
          [task.id]: comments
        }));
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    }
  }, [clearUnreadForTask, onFetchTaskComments, onFetchTaskHistory, fetchAndStoreTaskHistory]);

  const handleCloseCommentSidebar = useCallback(() => {
    setShowCommentSidebar(false);
    setSelectedTask(null);
    setCommentLoading(false);
    setDeletingCommentId(null);
  }, []);

  const handleSaveComment = useCallback(async (content: string) => {
    if (!selectedTask) {
      toast.error("No task selected");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    if (!selectedTask.id) {
      toast.error("Task ID not found");
      return;
    }

    const optimisticComment: CommentType = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: selectedTask.id,
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role
    };

    setTaskComments(prev => {
      const taskId = selectedTask.id;
      if (!taskId) return prev;

      const currentComments = prev[taskId] || [];
      return {
        ...prev,
        [taskId]: [...currentComments, optimisticComment]
      };
    });

    const commentToSave = content;
    setCommentLoading(true);

    if (onSaveComment && typeof onSaveComment === 'function') {
      try {
        const savedComment = await onSaveComment(selectedTask.id, commentToSave);

        if (savedComment) {
          // Add history for comment
          await addHistoryRecord(
            selectedTask.id,
            'comment_added',
            `Comment added by ${currentUser.role} (${currentUser.name})`,
            {
              commentId: savedComment.id,
              commentPreview: savedComment.content.substring(0, 100)
            }
          );

          setTaskComments(prev => {
            const taskId = selectedTask.id;
            if (!taskId) return prev;

            const currentComments = prev[taskId] || [];
            const updatedComments = currentComments.map(comment =>
              comment.id === optimisticComment.id ? savedComment : comment
            );

            if (!currentComments.some(c => c.id === optimisticComment.id)) {
              updatedComments.push(savedComment);
            }

            return {
              ...prev,
              [taskId]: updatedComments
            };
          });

          toast.success(' Comment added successfully!');
        }
      } catch (error: any) {
        setTaskComments(prev => {
          const taskId = selectedTask.id;
          if (!taskId) return prev;

          const currentComments = prev[taskId] || [];
          return {
            ...prev,
            [taskId]: currentComments.filter(
              comment => !comment.id.startsWith('optimistic-')
            )
          };
        });

        if (error.message?.includes('Network') || error.message?.includes('fetch')) {
          toast.error('🌐 Network error. Please check your connection.');
        } else if (error.response?.status === 401) {
          toast.error('🔐 Authentication error. Please login again.');
        } else {
          toast.error('❌ Failed to save comment. Please try again.');
        }

      } finally {
        setCommentLoading(false);
      }
    } else {
      toast.success('💾 Comment saved locally (offline mode)');
      setCommentLoading(false);
    }
  }, [selectedTask, currentUser, onSaveComment, addHistoryRecord]);

  const handleDeleteComment = useCallback(async (taskId: string, commentId: string) => {
    if (!onDeleteComment) {
      toast.error("Delete comment functionality not available");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    setDeletingCommentId(commentId);

    try {
      await onDeleteComment(taskId, commentId);

      // Remove comment from local state
      setTaskComments(prev => {
        const currentComments = prev[taskId] || [];
        return {
          ...prev,
          [taskId]: currentComments.filter(comment => comment.id !== commentId)
        };
      });

      // Add history record for comment deletion
      await addHistoryRecord(
        taskId,
        'comment_deleted',
        `Comment deleted by ${currentUser.role} (${currentUser.name})`,
        {
          deletedAt: new Date().toISOString(),
          deletedBy: currentUser.email
        }
      );

      toast.success("Comment deleted successfully");
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(`Failed to delete comment: ${error.message || 'Unknown error'}`);
    } finally {
      setDeletingCommentId(null);
    }
  }, [onDeleteComment, addHistoryRecord, currentUser]);

  const handleOpenApprovalModal = useCallback((task: Task, action: 'approve' | 'reject') => {
    setTaskToApprove(task);
    setApprovalAction(action);
    setShowApprovalModal(true);
  }, []);

  const handleCloseApprovalModal = useCallback(() => {
    setShowApprovalModal(false);
    setTaskToApprove(null);
  }, []);

  const handleApproveTask = useCallback(async (approve: boolean) => {
    if (!taskToApprove || !onApproveTask) return;

    setApprovingTasks(prev => [...prev, taskToApprove.id]);

    try {
      await onApproveTask(taskToApprove.id, approve);

      if (approve) {
        await addHistoryRecord(
          taskToApprove.id,
          'admin_approved',
          `Task APPROVED by Admin (${currentUser.name})`,
          {
            approvedBy: currentUser.email,
            approvedAt: new Date().toISOString(),
            taskStatus: 'completed'
          }
        );

        toast.success(' Task approved by Admin!');
      } else {
        await addHistoryRecord(
          taskToApprove.id,
          'rejected_by_admin',
          `Task completion REJECTED by Admin (${currentUser.name})`,
          {
            rejectedBy: currentUser.email,
            rejectedAt: new Date().toISOString(),
            taskStatus: 'pending'
          }
        );

        toast.success('❌ Task rejected by Admin');
      }

      handleCloseApprovalModal();
    } catch (error) {
      console.error('Error in approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setApprovingTasks(prev => prev.filter(id => id !== taskToApprove.id));
    }
  }, [taskToApprove, onApproveTask, addHistoryRecord, currentUser, handleCloseApprovalModal]);

  const handleOpenReassignModal = useCallback((task: Task) => {
    try {
      const taskCompanyKey = String((task as any)?.companyName || (task as any)?.company || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
      const isMdImpexTask = taskCompanyKey === 'mdimpex';

      if (isMdImpexTask) {
        setMdImpexReassignTask(task);
        setMdImpexAssigneeEmail('');
        setShowMdImpexReassignModal(true);
        return;
      }
    } catch {
      // fall back to existing modal
    }

    setReassignTask(task);
    setReassignComment('');
    try {
      const taskCompanyKey = String((task as any)?.companyName || (task as any)?.company || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
      const isSpeedEcomTask = taskCompanyKey === 'speedecom';
      if (isSpeedEcomTask) {
        const assignedToCandidate: any = (task as any)?.assignedToUser || (task as any)?.assignedTo;
        const assignedToEmail = String(
          (typeof assignedToCandidate === 'string'
            ? (assignedToCandidate.includes('@') ? assignedToCandidate : '')
            : (assignedToCandidate?.email || ''))
        ).trim().toLowerCase();
        setNewAssigneeId(assignedToEmail || '');
      } else {
        setNewAssigneeId('');
      }
    } catch {
      setNewAssigneeId('');
    }
    try {
      const raw = (task as any)?.dueDate;
      const normalized = raw ? new Date(raw).toISOString().split('T')[0] : '';
      setNewDueDate(normalized || '');
    } catch {
      setNewDueDate('');
    }
    setShowReassignModal(true);
  }, []);

  const handleCloseMdImpexReassignModal = useCallback(() => {
    setShowMdImpexReassignModal(false);
    setMdImpexReassignTask(null);
    setMdImpexAssigneeEmail('');
    setMdImpexSubmitting(false);
  }, []);

  const handleSubmitMdImpexReassign = useCallback(async () => {
    if (!mdImpexReassignTask?.id || !mdImpexAssigneeEmail || !onMdImpexReassignTask) return;

    setMdImpexSubmitting(true);
    try {
      await onMdImpexReassignTask(mdImpexReassignTask.id, mdImpexAssigneeEmail);
      handleCloseMdImpexReassignModal();
      toast.success('Task reassigned successfully');
    } catch (error) {
      console.error('Error reassigning MD Impex task:', error);
      toast.error('Failed to reassign task');
    } finally {
      setMdImpexSubmitting(false);
    }
  }, [handleCloseMdImpexReassignModal, mdImpexAssigneeEmail, mdImpexReassignTask?.id, onMdImpexReassignTask]);

  const normalizeRoleValue = useCallback((v: unknown) => String(v || '').trim().toLowerCase(), []);

  const resolveAssignerRole = useCallback((t: any): string => {
    const direct = normalizeRoleValue(t?.assignedByUser?.role || t?.assignedBy?.role);
    if (direct) return direct;

    const candidate = t?.assignedByUser || t?.assignedBy;
    if (!candidate) return '';

    const idOrEmail = typeof candidate === 'string'
      ? candidate
      : (candidate?.id || candidate?._id || candidate?.email || '');
    const key = String(idOrEmail || '').trim().toLowerCase();
    if (!key) return '';

    const found = (users || []).find((u: any) => {
      const id = String(u?.id || u?._id || '').trim().toLowerCase();
      const email = String(u?.email || '').trim().toLowerCase();
      return (id && id === key) || (email && email === key);
    });
    return normalizeRoleValue(found?.role);
  }, [normalizeRoleValue, users]);

  const handleCloseReassignModal = useCallback(() => {
    setShowReassignModal(false);
    setReassignLoading(false);
    setReassignTask(null);
    setNewAssigneeId('');
    setNewDueDate('');
    setReassignComment('');
  }, []);

  const handleReassignTask = useCallback(async () => {
    if (!reassignTask || !newAssigneeId || !newDueDate || !onReassignTask) return;

    setReassignLoading(true);

    try {
      await onReassignTask(reassignTask.id, newAssigneeId, newDueDate);

      try {
        const content = String(reassignComment || '').trim();
        if (content && onSaveComment) {
          await onSaveComment(reassignTask.id, content);
        }
      } catch {
        // ignore comment failure
      }

      // The onReassignTask from DashboardPage already updates the Redux store
      // but we need to ensure the local state is cleared and modal closed
      handleCloseReassignModal();
      toast.success(' Task reassigned successfully!');
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast.error('Failed to reassign task');
    } finally {
      setReassignLoading(false);
    }
  }, [reassignTask, newAssigneeId, newDueDate, onReassignTask, reassignComment, onSaveComment, addHistoryRecord, currentUser, getEmailByIdInternal, handleCloseReassignModal]);

  const handleOpenHistoryModal = useCallback(async (task: Task) => {
    setHistoryTask(task);
    setShowHistoryModal(true);

    // Load task history
    if (onFetchTaskHistory) {
      await fetchAndStoreTaskHistory(task.id);
    }
  }, [onFetchTaskHistory, fetchAndStoreTaskHistory]);

  const handleCloseHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
    setHistoryTask(null);
  }, []);

  // Update available brands when company filter changes
  useEffect(() => {
    const brands = getBrandsByCompanyInternal(effectiveAdvancedFilters.company);
    setAvailableBrands(brands);
  }, [effectiveAdvancedFilters.company, getBrandsByCompanyInternal]);

  useEffect(() => {
    void refreshTaskTypeCompanyOverrides();
  }, [refreshTaskTypeCompanyOverrides]);

  // ==================== FILTERED TASKS ====================
  const filteredTasks = useMemo(() => {
    const tasksWithDemoData = tasks.map(task => getTaskWithDemoData(task));

    let filtered = tasksWithDemoData.filter((task: Task) => {
      const isCompleted = isTaskCompleted(task.id);

      const roleKey = normalizeRoleKey(currentUser?.role);
      const myEmail = normalizeText(currentUser?.email);

      // SBM-only RM filter: show tasks assigned TO me (SBM) where the assigner is the selected RM or their AM/AR team
      if (roleKey === 'sbm' && effectiveAdvancedFilters.rm && effectiveAdvancedFilters.rm !== 'all') {
        const selectedRmEmail = normalizeText(effectiveAdvancedFilters.rm);
        if (selectedRmEmail) {
          const rmTeamRaw = String((effectiveAdvancedFilters as any)?.rmTeam || '').trim();
          const teamEmails = rmTeamRaw
            ? rmTeamRaw
              .split(',')
              .map((s) => normalizeText(s))
              .filter(Boolean)
            : (() => {
              const selectedRmDoc: any = (users || []).find((u: any) => normalizeText(u?.email) === selectedRmEmail);
              const selectedRmId = String(selectedRmDoc?.id || selectedRmDoc?._id || '').trim();
              return selectedRmId
                ? (users || [])
                  .filter((u: any) => String(u?.managerId || '').trim() === selectedRmId)
                  .filter((u: any) => {
                    const r = normalizeRoleKey(u?.role);
                    return r === 'am' || r === 'ar';
                  })
                  .map((u: any) => normalizeText(u?.email))
                  .filter(Boolean)
                : [];
            })();

          const allowedAssignees = Array.from(new Set([
            selectedRmEmail,
            ...teamEmails,
          ].map((s) => normalizeText(s)).filter(Boolean)));

          const assignedToEmail = normalizeText(
            (task as any)?.assignedToUser?.email ||
            (() => {
              const assignedTo: any = (task as any)?.assignedTo;
              if (!assignedTo) return '';
              if (typeof assignedTo === 'string') {
                if (assignedTo.includes('@')) return assignedTo;
                return getEmailByIdInternal(assignedTo) || '';
              }
              const directEmail = String(assignedTo?.email || '').trim();
              if (directEmail) return directEmail;
              const id = String(assignedTo?.id || assignedTo?._id || '').trim();
              if (id) return getEmailByIdInternal(id) || '';
              return '';
            })() ||
            ''
          );

          const isAssignedToMe = Boolean(myEmail && assignedToEmail && assignedToEmail === myEmail);
          if (!isAssignedToMe) return false;

          const assignedByEmail = normalizeText(
            (task as any)?.assignedByUser?.email ||
            (typeof (task as any)?.assignedBy === 'string' ? (task as any)?.assignedBy : (task as any)?.assignedBy?.email) ||
            (task as any)?.createdByEmail ||
            (typeof (task as any)?.createdBy === 'string' ? (task as any)?.createdBy : (task as any)?.createdBy?.email) ||
            ''
          );

          const isFromAllowed = Boolean(assignedByEmail && allowedAssignees.includes(assignedByEmail));
          if (!isFromAllowed) return false;
        }
      }

      if (roleKey === 'ob_manager') {
        const assignedByMe = normalizeText(getAssignerEmail(task)) === myEmail;
        const assignedToMe = normalizeText(
          (task as any)?.assignedToUser?.email ||
          (typeof (task as any)?.assignedTo === 'string' ? (task as any)?.assignedTo : (task as any)?.assignedTo?.email) ||
          (task as any)?.assignedTo ||
          ''
        ) === myEmail;

        let obManagerVisible = false;
        if (assignedByMe) obManagerVisible = true;
        if (assignedToMe) obManagerVisible = true;

        const assignerRole = resolveAssignerRole(task);
        if (assignerRole === 'ob_manager' || assignerRole === 'md_manager') obManagerVisible = true;

        if (!obManagerVisible) {
          // fallback: allow assistant-assigned tasks
          const direct = normalizeRoleKey((task as any)?.assignedToUser?.role);
          let assigneeRoleKey = direct;
          if (!assigneeRoleKey) {
            const candidate = (task as any)?.assignedToUser || (task as any)?.assignedTo;
            const idOrEmail = typeof candidate === 'string'
              ? candidate
              : (candidate?.id || candidate?._id || candidate?.email || '');
            const key = String(idOrEmail || '').trim().toLowerCase();
            const found = (users || []).find((u: any) => {
              const id = String(u?.id || u?._id || '').trim().toLowerCase();
              const email = String(u?.email || '').trim().toLowerCase();
              return (id && id === key) || (email && email === key);
            });
            assigneeRoleKey = normalizeRoleKey((found as any)?.role);
          }

          const isAssistantAssignee = assigneeRoleKey === 'assistant'
            || assigneeRoleKey === 'assistance'
            || assigneeRoleKey === 'assistence'
            || assigneeRoleKey === 'sub_assistance'
            || assigneeRoleKey === 'sub_assistence'
            || assigneeRoleKey === 'sub_assist'
            || assigneeRoleKey === 'sub_assistant'
            || assigneeRoleKey.includes('assistant')
            || assigneeRoleKey.includes('assistance')
            || assigneeRoleKey.includes('sub_assist');

          obManagerVisible = isAssistantAssignee;
        }

        if (!obManagerVisible) return false;
      }

      if (roleKey === 'manager' || roleKey === 'marketer_manager') {
        const assignedByMe = normalizeText(getAssignerEmail(task)) === myEmail;

        const assignedToEmail = normalizeText(
          (task as any)?.assignedToUser?.email ||
          (() => {
            const assignedTo: any = (task as any)?.assignedTo;
            if (!assignedTo) return '';
            if (typeof assignedTo === 'string') {
              if (assignedTo.includes('@')) return assignedTo;
              return getEmailByIdInternal(assignedTo) || '';
            }
            const directEmail = String(assignedTo?.email || '').trim();
            if (directEmail) return directEmail;
            const id = String(assignedTo?.id || assignedTo?._id || '').trim();
            if (id) return getEmailByIdInternal(id) || '';
            return '';
          })() ||
          ''
        );

        const assignedToMe = Boolean(myEmail && assignedToEmail && assignedToEmail === myEmail);

        if (!assignedByMe && !assignedToMe) return false;
      }

      // 🔥 CRITICAL FIX: sub_assistence/assistant should only see tasks assigned to them
      if (roleKey === 'sub_assistance' || roleKey === 'sub_assistence' || roleKey === 'sub_assist' || roleKey === 'sub_assistant' || roleKey === 'assistant') {
        const assignedToMe = normalizeText(getEmailByIdInternal(task.assignedTo)) === myEmail;
        if (!assignedToMe) return false;
      }

      // 🔥 CRITICAL FIX: Handle assigned filter correctly
      if (assignedFilter && assignedFilter !== 'all') {
        if (assignedFilter === 'assigned-to-me' && !isTaskAssignee(task)) {
          return false;
        }
        if (assignedFilter === 'assigned-by-me' && !isTaskAssigner(task)) {
          return false;
        }
      }

      // Apply advanced filters for assigned if set
      {
        const assignedValues = parseMultiValue(effectiveAdvancedFilters.assigned);
        if (assignedValues.length > 0) {
          const ok = assignedValues.some((assignedValue) => {
            if (assignedValue === 'assigned-to-me') return isTaskAssignee(task);
            if (assignedValue === 'assigned-by-me') return isTaskAssigner(task);
            return true;
          });
          if (!ok) return false;
        }

        // Handle specific team member filter: assigned-to:${email}
        if (effectiveAdvancedFilters.assigned.startsWith('assigned-to:')) {
          const targetEmail = effectiveAdvancedFilters.assigned.replace('assigned-to:', '').trim().toLowerCase();
          if (targetEmail) {
            const taskAssigneeEmail = normalizeText(
              (task as any)?.assignedToUser?.email ||
              (typeof (task as any)?.assignedTo === 'string' ? (task as any)?.assignedTo : (task as any)?.assignedTo?.email) ||
              getEmailByIdInternal((task as any)?.assignedTo) ||
              ''
            );
            if (taskAssigneeEmail !== targetEmail) return false;
          }
        }
      }

      // Status Filter
      let statusPass = true;
      const selectedStatuses = parseMultiValue(effectiveAdvancedFilters.status).map(s => s.toLowerCase());

      if (selectedStatuses.length > 0 && effectiveAdvancedFilters.status !== 'all') {
        const taskStatus = String(task.status || '').toLowerCase();

        const matches = selectedStatuses.some(s => {
          if (s === 'completed') return isCompleted;
          if (s === 'pending') return !isCompleted && ['pending', 'in-progress', 'reassigned'].includes(taskStatus);
          if (s === 'in-progress') return taskStatus === 'in-progress';
          if (s === 'reassigned') return taskStatus === 'reassigned';
          if (s === 'pending-approval' || s === 'unapproval') {
            // Only show tasks that are completed but pending approval (completedApproval is false or missing)
            return isCompleted && !Boolean((task as any).completedApproval);
          }
          if (s === 'approved') {
            // Only show tasks that are completed and approved (completedApproval is true)
            return isCompleted && Boolean((task as any).completedApproval);
          }
          return taskStatus === s;
        });

        if (!matches) statusPass = false;
      } else if (filter !== 'all') {
        const f = filter.toLowerCase();
        if (f === 'completed' && !isCompleted) statusPass = false;
        else if (f === 'pending' && (isCompleted || !['pending', 'in-progress', 'reassigned'].includes(String(task.status || '').toLowerCase()))) statusPass = false;
        else if (f === 'pending-approval') {
          // Only show tasks that are completed but pending approval (completedApproval is false)
          if (!isCompleted) statusPass = false;
          else if (Boolean((task as any).completedApproval)) statusPass = false;
        }
      }
      if (!statusPass) return false;

      // Priority Filter
      {
        const priorityValues = parseMultiValue(effectiveAdvancedFilters.priority).map((p) => p.toLowerCase());
        if (priorityValues.length > 0) {
          const taskPriority = task.priority?.toLowerCase() || '';
          if (!priorityValues.includes(taskPriority)) return false;
        }
      }

      // Task Type Filter
      if (effectiveAdvancedFilters.taskType !== 'all') {
        const canonicalizeTypeKey = (value: unknown): string => {
          const raw = (value == null ? '' : String(value)).trim();
          if (!raw) return '';
          const key = raw.toLowerCase().replace(/[\s-]+/g, ' ').trim();
          if (key === 'troubleshoot' || key === 'trouble shoot' || key === 'trubbleshot' || key === 'trubble shoot') return 'troubleshoot';
          return raw.toLowerCase();
        };

        const filterTypeKeys = parseMultiValue(effectiveAdvancedFilters.taskType)
          .map((t) => canonicalizeTypeKey(t))
          .filter(Boolean);
        if (filterTypeKeys.length > 0) {
          const taskTypeKey = canonicalizeTypeKey((task as any).taskType || (task as any).type);
          if (!taskTypeKey) return false;
          if (!filterTypeKeys.includes(taskTypeKey)) return false;
        }
      }

      // Company Filter
      {
        const companyValues = parseMultiValue(effectiveAdvancedFilters.company);
        if (companyValues.length > 0) {
          const filterCompanyKeys = companyValues.map((c) => normalizeCompanyKey(c)).filter(Boolean);
          const taskCompanyKey = normalizeCompanyKey((task as any).companyName || (task as any).company || '');
          if (!filterCompanyKeys.includes(taskCompanyKey)) return false;
        }
      }

      // Brand Filter
      {
        const brandValues = parseMultiValue(effectiveAdvancedFilters.brand).map((b) => b.toLowerCase());
        if (brandValues.length > 0) {
          const taskBrand = task.brand?.toLowerCase() || '';
          if (!brandValues.includes(taskBrand)) return false;
        }
      }

      // Date Filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);

      const dateFilterToUse = effectiveAdvancedFilters.date !== 'all' ? effectiveAdvancedFilters.date : dateFilter;

      {
        const dateValues = parseMultiValue(dateFilterToUse);
        if (dateValues.length > 0) {
          const ok = dateValues.some((v) => {
            if (v === 'today') return taskDate.getTime() === today.getTime();
            if (v === 'week') {
              const weekFromNow = new Date(today);
              weekFromNow.setDate(weekFromNow.getDate() + 7);
              return !(taskDate > weekFromNow || taskDate < today);
            }
            if (v === 'overdue') return isOverdue(task.dueDate, task.status);
            return true;
          });
          if (!ok) return false;
        }
      }

      // Speed E Com - Group Number Search (brand.groupNumber)
      if (isSpeedEcomUser && groupNumberSearch.trim()) {
        const query = groupNumberSearch.trim().toLowerCase();
        const speedKey = normalizeCompanyKey(SPEED_E_COM_COMPANY_KEY);
        const taskCompanyKey = normalizeCompanyKey((task as any)?.companyName || (task as any)?.company || '');

        if (taskCompanyKey !== speedKey) return false;

        const taskBrandId = String((task as any)?.brandId || '').trim();
        const taskBrandName = String((task as any)?.brand || '').trim().toLowerCase();

        const list = Array.isArray(brands) ? (brands as any[]) : [];
        const matchingBrand = taskBrandId
          ? list.find((b: any) => String(b?._id || b?.id || '').trim() === taskBrandId)
          : (taskBrandName
            ? list.find((b: any) => (
              normalizeCompanyKey(b?.company) === speedKey &&
              String(b?.name || '').trim().toLowerCase() === taskBrandName
            ))
            : undefined);

        const groupNumberValue = matchingBrand?.groupNumber;
        const groupNumberText = groupNumberValue == null ? '' : String(groupNumberValue).trim().toLowerCase();

        if (!groupNumberText) return false;
        if (!groupNumberText.includes(query)) return false;
      }

      // Search Filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();

        const titleText = String(task.title || '').toLowerCase();

        const assignedToEmail = String(
          (task as any)?.assignedToUser?.email ||
          (typeof (task as any)?.assignedTo === 'string' ? (task as any)?.assignedTo : (task as any)?.assignedTo?.email) ||
          getEmailByIdInternal((task as any)?.assignedTo) ||
          ''
        ).toLowerCase();
        const assignedByEmail = String(getAssignerEmail(task) || '').toLowerCase();

        const assignedToName = String((task as any)?.assignedToUser?.name || '').toLowerCase();
        const assignedByName = String((task as any)?.assignedByUser?.name || '').toLowerCase();

        const typeText = String((task as any)?.taskType || (task as any)?.type || '').toLowerCase();
        const companyText = String((task as any)?.companyName || (task as any)?.company || '').toLowerCase();
        const brandText = String((task as any)?.brand || '').toLowerCase();

        const matchesTitle = Boolean(titleText && titleText.includes(q));
        const matchesAssigneeEmail = Boolean(assignedToEmail && assignedToEmail.includes(q));
        const matchesAssignerEmail = Boolean(assignedByEmail && assignedByEmail.includes(q));
        const matchesAssigneeName = Boolean(assignedToName && assignedToName.includes(q));
        const matchesAssignerName = Boolean(assignedByName && assignedByName.includes(q));
        const matchesType = Boolean(typeText && typeText.includes(q));
        const matchesCompany = Boolean(companyText && companyText.includes(q));
        const matchesBrand = Boolean(brandText && brandText.includes(q));

        if (!matchesTitle && !matchesAssigneeEmail && !matchesAssignerEmail &&
          !matchesAssigneeName && !matchesAssignerName &&
          !matchesType && !matchesCompany && !matchesBrand) {
          return false;
        }
      }

      return true;
    });

    // Sorting - Show newest tasks first by creation date
    filtered.sort((a, b) => {
      const aValue = new Date(a.createdAt || a.id).getTime();
      const bValue = new Date(b.createdAt || b.id).getTime();
      return bValue - aValue; // Descending order (newest first)
    });

    return filtered;
  }, [
    tasks,
    filter,
    dateFilter,
    assignedFilter,
    searchTerm,
    groupNumberSearch,
    isSpeedEcomUser,
    brands,
    normalizeCompanyKey,
    effectiveAdvancedFilters,
    isTaskCompleted,
    isTaskAssignee,
    isTaskAssigner,
    isOverdue,
    getEmailByIdInternal,
    getAssignerEmail,
    currentUser,
    normalizeRoleKey,
    normalizeText,
    users
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filter,
    dateFilter,
    assignedFilter,
    searchTerm,
    groupNumberSearch,
    effectiveAdvancedFilters.status,
    effectiveAdvancedFilters.priority,
    effectiveAdvancedFilters.assigned,
    effectiveAdvancedFilters.date,
    effectiveAdvancedFilters.taskType,
    effectiveAdvancedFilters.company,
    effectiveAdvancedFilters.brand,
    effectiveAdvancedFilters.rm,
    tasksPerPage
  ]);

  const totalTasks = filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasks / tasksPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startItemIndex = totalTasks === 0 ? 0 : (currentPageSafe - 1) * tasksPerPage + 1;
  const endItemIndex = totalTasks === 0 ? 0 : Math.min(startItemIndex + tasksPerPage - 1, totalTasks);

  const paginatedTasks = useMemo(() => {
    if (!filteredTasks.length) return [] as Task[];
    const startIndex = (currentPageSafe - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPageSafe, tasksPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (pageLoading) {
    return <TasksPageSkeleton />;
  }

  // ==================== RENDER ====================
  const roleKey = normalizeRoleKey(currentUser?.role);
  const isObManagerRole = roleKey === 'ob_manager';
  const isAssistantViewOnly = false;
  const isSubAssistanceRole = roleKey === 'sub_assistance'
    || roleKey === 'sub_assistence'
    || roleKey === 'sub_assist'
    || roleKey === 'sub_assistant';
  const isAssistantLikeRole = roleKey === 'assistant'
    || roleKey === 'sub_assistance'
    || roleKey === 'sub_assistence'
    || roleKey === 'sub_assist'
    || roleKey === 'sub_assistant';
  const isBulkImportDisabled = isAssistantLikeRole;
  const isCreateTaskDisabled = isSubAssistanceRole;

  const canAccessCreateTask = (() => {
    const perms = (currentUser as any)?.permissions;
    if (!perms || typeof perms !== 'object') return true;
    if (Object.keys(perms).length === 0) return true;
    if (typeof (perms as any).create_task === 'undefined') return true;

    const perm = String((perms as any).create_task || '').trim().toLowerCase();
    if (['deny', 'no', 'false', '0', 'disabled'].includes(perm)) return false;
    if (['allow', 'allowed', 'yes', 'true', '1'].includes(perm)) return true;
    return perm !== 'deny';
  })();

  const canShowCreateTaskButton = canAccessCreateTask && !isCreateTaskDisabled;
  const body = (
    <>
      {/* Main Content */}
      <div className={embedded ? '' : 'px-4 py-8 sm:px-6 lg:px-8'}>
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No tasks found</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {searchTerm || filter !== 'all' || dateFilter !== 'all' || assignedFilter !== 'all'
                ? 'Try changing your filters or search term to find what you\'re looking for'
                : 'Get started by creating your first task or importing tasks in bulk'}
            </p>
            {!isAssistantViewOnly && !hideCreateAndBulkActions && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {!isBulkImportDisabled && (
                  <button
                    onClick={handleOpenBulkImporter}
                    className="inline-flex items-center px-5 py-3 border-2 border-gray-200 rounded-xl bg-white text-base font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Bulk Import Tasks
                  </button>
                )}
                {canShowCreateTaskButton && (
                  <button
                    onClick={handleCreateTaskWithHistory}
                    className="inline-flex items-center px-5 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Task
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header - Desktop */}
            <div className="hidden md:grid grid-cols-11 gap-1.5 px-4 py-2.5 bg-primary-ultralight rounded-lg border border-primary-light/20 text-xs font-semibold text-primary-dark items-center">
              <div className="col-span-1 text-center">#/Status</div>
              <div className="col-span-1 text-center">Brand</div>
              <div className={hideAssignBy ? "col-span-3" : "col-span-2"}>Task Title</div>
              {assignedFilter !== 'assigned-to-me' && <div className="col-span-1 text-center">Assign To</div>}
              {!hideAssignBy && <div className="col-span-1 text-center">Assign By</div>}
              <div className="col-span-1 text-center">Created</div>
              <div className="col-span-1 text-center">Due Date</div>
              <div className="col-span-2 pl-2.5 border-l border-primary-light/30">Last Comment</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Task List */}
            {paginatedTasks.map((task, idx) => {
              const isToggling = togglingStatusTasks.includes(task.id);
              const isDeleting = deletingTasks.includes(task.id);
              const isApproving = approvingTasks.includes(task.id);
              const isUpdatingApproval = updatingApproval.includes(task.id);

              const statusKey = String((task as any)?.status || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
              const isCompleted = statusKey === 'completed' || isTaskCompleted(task.id);

              const brandLabel = formatBrandWithGroupNumber(task);

              const roleKey = normalizeRoleKey((currentUser as any)?.role);
              const myEmail = String((currentUser as any)?.email || '').trim().toLowerCase();
              const assignedByEmail = String(
                (task as any)?.assignedByUser?.email ||
                (typeof (task as any)?.assignedBy === 'string' ? (task as any)?.assignedBy : (task as any)?.assignedBy?.email) ||
                (task as any)?.assignedBy ||
                ''
              ).trim().toLowerCase();

              const assignedToEmail = String(
                (task as any)?.assignedToUser?.email ||
                (typeof (task as any)?.assignedTo === 'string' ? (task as any)?.assignedTo : (task as any)?.assignedTo?.email) ||
                (task as any)?.assignedTo ||
                ''
              ).trim().toLowerCase();

              const isAssignee = Boolean(myEmail && assignedToEmail && myEmail === assignedToEmail);

              const taskCompanyKey = normalizeCompanyKey((task as any)?.companyName || (task as any)?.company || '');
              const speedCompanyKey = normalizeCompanyKey(SPEED_E_COM_COMPANY_KEY);
              const isSpeedEcomTask = Boolean(taskCompanyKey && taskCompanyKey === speedCompanyKey);
              const isMdImpexTask = taskCompanyKey === 'mdimpex';
              const myCompanyKey = normalizeCompanyKey((currentUser as any)?.companyName || (currentUser as any)?.company || '');

              const myUserId = String((currentUser as any)?.id || (currentUser as any)?._id || '').trim();
              const myManagerId = String((currentUser as any)?.managerId || '').trim();
              const assignedByUserRoleKey = normalizeRoleKey((task as any)?.assignedByUser?.role);
              const assignedByUserId = String((task as any)?.assignedByUser?.id || (task as any)?.assignedByUser?._id || '').trim();
              const creatorUserDoc: any = (users || []).find((u: any) => {
                const uEmail = String(u?.email || '').trim().toLowerCase();
                return uEmail && uEmail === assignedByEmail;
              });

              const isManagerRole = roleKey === 'manager' || roleKey === 'marketer_manager' || roleKey === 'md_manager';

              const isRmRole = roleKey === 'rm';
              const isAmRole = roleKey === 'am';

              const myRmEmail = (() => {
                if (!isAmRole) return '';
                if (!myManagerId) return '';
                const rmDoc: any = (users || []).find((u: any) => String(u?.id || u?._id || '').trim() === myManagerId);
                return String(rmDoc?.email || '').trim().toLowerCase();
              })();

              const canRmReassignByChain = Boolean(
                isRmRole &&
                (
                  (myEmail && assignedByEmail && myEmail === assignedByEmail) ||
                  (
                    // creator is my AM (managerId points to me) - allow even if role info missing
                    String(creatorUserDoc?.managerId || '').trim() &&
                    String(creatorUserDoc?.managerId || '').trim() === myUserId &&
                    (assignedByUserRoleKey === 'am' || !assignedByUserRoleKey)
                  )
                )
              );

              const canAmReassignByChain = Boolean(
                isAmRole &&
                (
                  (myEmail && assignedByEmail && myEmail === assignedByEmail) ||
                  (isAssignee && assignedByUserRoleKey === 'rm') ||
                  (myManagerId && assignedByUserId && myManagerId === assignedByUserId) ||
                  (myManagerId && String(creatorUserDoc?.id || creatorUserDoc?._id || '').trim() && String(creatorUserDoc?.id || creatorUserDoc?._id || '').trim() === myManagerId) ||
                  (myRmEmail && assignedByEmail && myRmEmail === assignedByEmail)
                )
              );

              const canReassignNonSpeedEcom = Boolean(
                roleKey === 'ob_manager' ||
                myEmail === 'keyurismartbiz@gmail.com' ||
                (isManagerRole && myEmail && assignedByEmail && myEmail === assignedByEmail) ||
                canRmReassignByChain ||
                canAmReassignByChain
              );

              const canReassignMdImpex = Boolean(
                roleKey === 'admin' ||
                roleKey === 'super_admin' ||
                roleKey === 'ob_manager' ||
                myEmail === 'keyurismartbiz@gmail.com'
              );

              const showAssignButton = (isMdImpexTask
                ? Boolean(myCompanyKey === 'mdimpex' && canReassignMdImpex)
                : isCompleted && (isSpeedEcomTask
                  ? Boolean(
                    // Speed E Com: allow creator OR RM/AM pair members (including assignee) after completion
                    (myEmail && assignedByEmail && myEmail === assignedByEmail) ||
                    (isAssignee && (isRmRole || isAmRole)) ||
                    canRmReassignByChain ||
                    canAmReassignByChain
                  )
                  : Boolean(
                    canReassignNonSpeedEcom ||
                    (isAmRole && isAssignee)
                  )));

              return (
                <div key={`${task.id}-${idx}`}>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    <MobileTaskItem
                      task={task}
                      isToggling={isToggling}
                      isDeleting={isDeleting}
                      isApproving={isApproving}
                      isUpdatingApproval={isUpdatingApproval}
                      openMenuId={openMenuId}
                      currentUser={currentUser}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      getTaskBorderColor={getTaskBorderColor}
                      getTaskStatusIcon={(taskId: string, isCompleted: boolean) => getTaskStatusIcon(taskId, isCompleted, isToggling)}
                      getUserInfoForDisplay={getUserInfoForDisplay}
                      brandLabel={brandLabel}
                      onToggleStatus={handleToggleTaskStatus}
                      onEditTaskClick={handleOpenEditModal}
                      onOpenCommentSidebar={handleOpenCommentSidebar}
                      onOpenReassignModal={handleOpenReassignModal}
                      onPermanentApproval={handlePermanentApproval}
                      onOpenApprovalModal={handleOpenApprovalModal}
                      onDeleteTask={handleDeleteTask}
                      onSetOpenMenuId={setOpenMenuId}
                      isTaskAssignee={isTaskAssignee}
                      isTaskAssigner={isTaskAssigner}
                      isTaskCompleted={isTaskCompleted}
                      isTaskPermanentlyApproved={isTaskPermanentlyApproved}
                      isTaskPendingApproval={isTaskPendingApproval}
                      onOpenHistoryModal={handleOpenHistoryModal}
                      showAssignButton={showAssignButton}
                      onAssignClick={handleOpenReassignModal}
                      disableStatusToggle={(isObManagerRole && !isTaskAssignee(task) && !isTaskAssigner(task)) || (!isObManagerRole && !isTaskAssignee(task))}
                      hasUnreadComments={(taskId: string) => Boolean(unreadCommentsMap && (unreadCommentsMap as any)[taskId])}
                      canEditTask={canEditTask}
                    />
                  </div>


                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <DesktopTaskItem
                      index={(currentPageSafe - 1) * tasksPerPage + idx + 1}
                      task={task}
                      isToggling={isToggling}
                      assignedFilter={assignedFilter}
                      currentUser={currentUser}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      getTaskBorderColor={getTaskBorderColor}
                      getTaskStatusIcon={(taskId: string, isCompleted: boolean) => getTaskStatusIcon(taskId, isCompleted, isToggling)}
                      getUserInfoForDisplay={getUserInfoForDisplay}
                      brandLabel={brandLabel}
                      brands={brands}
                      onToggleStatus={handleToggleTaskStatus}
                      onEditTaskClick={handleOpenEditModal}
                      onOpenCommentSidebar={handleOpenCommentSidebar}
                      onOpenHistoryModal={handleOpenHistoryModal}
                      onDeleteTask={handleDeleteTask}
                      isTaskCompleted={isTaskCompleted}
                      isTaskPermanentlyApproved={isTaskPermanentlyApproved}
                      isTaskAssignee={isTaskAssignee}
                      isTaskAssigner={isTaskAssigner}
                      canEditTask={canEditTask}
                      onPermanentApproval={handlePermanentApproval}
                      isUpdatingApproval={isUpdatingApproval}
                      showAssignButton={showAssignButton}
                      onAssignClick={handleOpenReassignModal}
                      disableStatusToggle={(isObManagerRole && !isTaskAssignee(task) && !isTaskAssigner(task)) || (!isObManagerRole && !isTaskAssignee(task))}
                      hasUnreadComments={(taskId: string) => Boolean(unreadCommentsMap && (unreadCommentsMap as any)[taskId])}
                      hideAssignBy={hideAssignBy}
                    />
                  </div>
                </div>
              );
            })}

            {totalTasks > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                <div className="text-sm text-gray-600">
                  {`Showing ${startItemIndex}-${endItemIndex} of ${totalTasks} tasks`}
                </div>
                <div className="inline-flex items-center gap-2">
                  <select
                    value={String(tasksPerPage)}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      setTasksPerPage(next);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPageSafe === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPageSafe} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPageSafe === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImporter && !isBulkImportDisabled && !hideCreateAndBulkActions && (
        <BulkImporter
          draftTasks={bulkDraftTasks}
          defaults={bulkImportDefaults}
          show={showBulkImporter}
          setShow={setShowBulkImporter}
          companyBrandMap={COMPANY_BRAND_MAP}
          availableTaskTypes={availableTaskTypesForBulk}
          onDefaultsChange={handleBulkDefaultsChange}
          onDraftsChange={handleBulkDraftsChange}
          onClose={() => setShowBulkImporter(false)}
          onSubmit={handleBulkImportSubmit}
          submitting={bulkSubmitting}
          summary={bulkCreateSummary}
          getBrandsByCompany={getBrandsByCompanyInternal}
          users={users}
          currentUser={currentUser}
        />
      )}

      {/* Comment Sidebar */}
      <CommentSidebar
        showCommentSidebar={showCommentSidebar}
        selectedTask={selectedTask}
        commentLoading={commentLoading}
        deletingCommentId={deletingCommentId}
        loadingComments={loadingComments}
        loadingHistory={selectedTask ? loadingHistory[selectedTask.id] : false}
        currentUser={currentUser}
        formatDate={formatDate}
        isOverdue={isOverdue}
        formatBrandLabel={formatBrandWithGroupNumber}
        onCloseSidebar={handleCloseCommentSidebar}
        onSaveComment={handleSaveComment}
        onDeleteComment={onDeleteComment ? (commentId: string) => handleDeleteComment(selectedTask?.id || '', commentId) : undefined}
        defaultTab={commentSidebarTab}
        getTaskComments={getTaskCommentsInternal}
        getUserInfoForDisplay={getUserInfoForDisplay}
        isTaskCompleted={isTaskCompleted}
        getStatusBadgeColor={getStatusBadgeColor}
        getStatusText={getStatusText}
        formatDateTime={formatDateTime}
      />

      {/* Approval Modal */}
      <ApprovalModal
        showApprovalModal={showApprovalModal}
        taskToApprove={taskToApprove}
        approvalAction={approvalAction}
        approvingTasks={approvingTasks}
        onClose={handleCloseApprovalModal}
        onApprove={handleApproveTask}
      />

      {/* Reassign Modal */}
      <ReassignModal
        showReassignModal={showReassignModal}
        reassignTask={reassignTask}
        newAssigneeId={newAssigneeId}
        newDueDate={newDueDate}
        reassignComment={reassignComment}
        reassignLoading={reassignLoading}
        users={users}
        currentUser={currentUser}
        onClose={handleCloseReassignModal}
        onAssigneeChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAssigneeId(e.target.value)}
        onDueDateChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDueDate(e.target.value)}
        onCommentChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReassignComment(e.target.value)}
        onReassign={handleReassignTask}
      />

      <MdImpexReassignModal
        show={showMdImpexReassignModal}
        task={mdImpexReassignTask}
        users={users}
        currentUser={currentUser}
        newAssigneeEmail={mdImpexAssigneeEmail}
        isSubmitting={mdImpexSubmitting}
        onClose={handleCloseMdImpexReassignModal}
        onAssigneeChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMdImpexAssigneeEmail(e.target.value)}
        onSubmit={handleSubmitMdImpexReassign}
      />

      {/* Task History Modal - UPDATED WITH NEW PROPS */}
      <TaskHistoryModal
        showHistoryModal={showHistoryModal}
        historyTask={historyTask}
        timelineItems={getTimelineItems(historyTask?.id || '')}
        loadingHistory={historyTask ? loadingHistory[historyTask.id] : false}
        loadingComments={loadingComments}
        currentUser={currentUser}
        users={users}
        onClose={handleCloseHistoryModal}
        formatDate={formatDate}
        getEmailByIdInternal={getEmailByIdInternal}
        getAssignerEmail={getAssignerEmail}
      />
    </>
  );

  if (embedded && !showFiltersInEmbedded) {
    return <div>{body}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-black">
                {assignedFilter === 'assigned-by-me'
                  ? 'Tasks Assigned By Me'
                  : assignedFilter === 'assigned-to-me'
                    ? 'My Tasks'
                    : 'All Tasks'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {assignedFilter === 'assigned-by-me'
                  ? 'Tasks you have assigned to others'
                  : assignedFilter === 'assigned-to-me'
                    ? 'Tasks assigned to you'
                    : 'Manage and track all tasks in one place'}
              </p>
            </div>

            {!isAssistantViewOnly && (
              <div className="flex items-center gap-2">
                {isSpeedEcomUser ? (
                  <div className="hidden sm:block">
                    <input
                      type="text"
                      value={groupNumberSearch}
                      onChange={(e) => setGroupNumberSearch(e.target.value)}
                      placeholder="Search Group #"
                      className="w-32 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                    />
                  </div>
                ) : null}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-[#3b82f6]" />
                  {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
                </button>

                {!hideCreateAndBulkActions && !isBulkImportDisabled && (
                  <button
                    onClick={handleOpenBulkImporter}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-[#1e3a8a] hover:bg-[#1e3a8a] transition-colors shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Bulk Import
                  </button>
                )}

                {!hideCreateAndBulkActions && canShowCreateTaskButton && (
                  <button
                    onClick={handleCreateTaskWithHistory}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-[#3b82f6] hover:bg-[#3b82f6] transition-colors shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Task
                  </button>
                )}
              </div>
            )}
          </div>

          {!isAssistantViewOnly && (
            <>
              {/* Advanced Filters */}
              <AdvancedFiltersPanel
                filters={effectiveAdvancedFilters}
                availableCompanies={Object.keys(COMPANY_BRAND_MAP).sort((a, b) => a.localeCompare(b))}
                availableTaskTypes={availableTaskTypesForFilters}
                availableBrands={availableBrands}
                getBrandLabel={getBrandLabelForFilter}
                availableRms={availableRmUsersForFilters}
                users={users}
                currentUser={currentUser}
                onFilterChange={handleFilterChange}
                onResetFilters={resetFilters}
                onApplyFilters={applyAdvancedFilters}
                showFilters={showAdvancedFilters}
                onToggleFilters={() => setShowAdvancedFilters(false)}
              />

              {/* Bulk Actions */}
              <BulkActions
                selectedTasks={selectedTasks}
                bulkDeleting={bulkDeleting}
                onBulkComplete={() => handleBulkStatusChange('completed')}
                onBulkPending={() => handleBulkStatusChange('pending')}
                onBulkDelete={handleBulkDelete}
                onClearSelection={() => setSelectedTasks([])}
              />
            </>
          )}
        </div>
      </div>

      {body}
    </div>
  );
});

export default AllTasksPage;
