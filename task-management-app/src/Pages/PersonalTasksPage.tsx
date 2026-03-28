import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, ListTodo, Pencil, Plus, Trash2, User, X, CheckCircle, Circle, Loader2, Bell, Flag, Sparkles } from 'lucide-react';
import type { UserType } from '../Types/Types';
import { personalTaskService, type PersonalTask, type PersonalTaskPriority, type PersonalTaskReminderStyle, type PersonalTaskStatus } from '../Services/PersonalTask.service';

interface PersonalTasksPageProps {
  currentUser: UserType;
}

const normalizeText = (v: any) => (v == null ? '' : String(v)).trim();
const formatDateTimeSafe = (value: any): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function PersonalTasksPage({ currentUser }: PersonalTasksPageProps) {
  const creatorEmail = useMemo(() => normalizeText(currentUser?.email).toLowerCase(), [currentUser?.email]);
  const companyName = useMemo(() => normalizeText((currentUser as any)?.companyName || (currentUser as any)?.company), [currentUser]);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<PersonalTaskPriority>('medium');
  const [reminderStyle, setReminderStyle] = useState<PersonalTaskReminderStyle>('none');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [status, setStatus] = useState<PersonalTaskStatus>('pending');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [reminderPopupTask, setReminderPopupTask] = useState<PersonalTask | null>(null);
  const timersRef = useRef<Record<string, number>>({});

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter(t => t.status === activeFilter);
  }, [tasks, activeFilter]);

  const canSubmit = useMemo(() => {
    if (!normalizeText(title)) return false;
    if (!creatorEmail) return false;
    if (reminderStyle === 'once' && !normalizeText(reminderDate)) return false;
    return true;
  }, [title, creatorEmail, reminderStyle, reminderDate]);

  useEffect(() => {
    if (reminderStyle === 'none') {
      setReminderDate('');
      setReminderTime('');
    }
  }, [reminderStyle]);

  const clearAllReminderTimers = useCallback(() => {
    const timers = timersRef.current;
    Object.keys(timers).forEach((k) => {
      const id = timers[k];
      if (id) window.clearTimeout(id);
    });
    timersRef.current = {};
  }, []);

  useEffect(() => {
    clearAllReminderTimers();
    const now = Date.now();
    const nextTimers: Record<string, number> = {};

    (tasks || []).forEach((t) => {
      if (!t?.id) return;
      if (t.reminderStyle !== 'once') return;
      if (!t.reminderAt) return;

      const target = new Date(t.reminderAt).getTime();
      if (!Number.isFinite(target)) return;
      const delay = target - now;
      if (delay <= 0 || delay > 2147483000) return;

      nextTimers[t.id] = window.setTimeout(() => setReminderPopupTask(t), delay);
    });

    timersRef.current = nextTimers;
    return () => clearAllReminderTimers();
  }, [tasks, clearAllReminderTimers]);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await personalTaskService.mine({ limit: 200 });
      if (!res.success) {
        toast.error(res.message || 'Failed to fetch personal tasks');
        setTasks([]);
        return;
      }
      setTasks(res.data as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMine();
  }, [fetchMine]);

  const onCreate = useCallback(async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const hasDate = Boolean(normalizeText(reminderDate));
      const timePart = normalizeText(reminderTime) || '00:00';
      const reminderAtIso = hasDate ? new Date(`${reminderDate}T${timePart}`).toISOString() : null;

      const res = await personalTaskService.create({
        title: normalizeText(title),
        status,
        purpose: normalizeText(purpose),
        priority,
        reminderStyle,
        reminderAt: reminderAtIso,
        companyName
      });

      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to create personal task');
        return;
      }

      toast.success('Personal task created');
      setTitle('');
      setPurpose('');
      setPriority('medium');
      setReminderStyle('none');
      setReminderDate('');
      setReminderTime('');
      setStatus('pending');
      setEditingId(null);

      await fetchMine();
    } finally {
      setCreating(false);
    }
  }, [canSubmit, title, status, purpose, priority, reminderStyle, reminderDate, reminderTime, companyName, fetchMine]);

  const onDelete = useCallback(async (id: string) => {
    if (!id) return;
    const ok = window.confirm('Delete this personal task?');
    if (!ok) return;

    const res = await personalTaskService.delete(id);
    if (!res.success) {
      toast.error(res.message || 'Failed to delete');
      return;
    }
    toast.success('Deleted');
    await fetchMine();
  }, [fetchMine]);

  const startEdit = useCallback((t: PersonalTask) => {
    setEditingId(t.id);
    setTitle(t.title || '');
    setPurpose(t.purpose || '');
    setPriority((t.priority || 'medium') as PersonalTaskPriority);
    setReminderStyle((t.reminderStyle || 'none') as PersonalTaskReminderStyle);
    setStatus(((t as any).status || 'pending') as PersonalTaskStatus);

    const rAt = t.reminderAt ? new Date(t.reminderAt) : null;
    if (rAt && !Number.isNaN(rAt.getTime())) {
      const yyyy = String(rAt.getFullYear());
      const mm = String(rAt.getMonth() + 1).padStart(2, '0');
      const dd = String(rAt.getDate()).padStart(2, '0');
      const hh = String(rAt.getHours()).padStart(2, '0');
      const mi = String(rAt.getMinutes()).padStart(2, '0');
      setReminderDate(`${yyyy}-${mm}-${dd}`);
      setReminderTime(`${hh}:${mi}`);
    } else {
      setReminderDate('');
      setReminderTime('');
    }
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setPurpose('');
    setPriority('medium');
    setReminderStyle('none');
    setReminderDate('');
    setReminderTime('');
    setStatus('pending');
  }, []);

  const onSaveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!canSubmit) return;

    setCreating(true);
    try {
      const hasDate = Boolean(normalizeText(reminderDate));
      const timePart = normalizeText(reminderTime) || '00:00';
      const reminderAtIso = hasDate ? new Date(`${reminderDate}T${timePart}`).toISOString() : null;

      const res = await personalTaskService.update(editingId, {
        title: normalizeText(title),
        purpose: normalizeText(purpose),
        priority,
        status,
        reminderStyle,
        reminderAt: reminderAtIso,
      });

      if (!res.success) {
        toast.error(res.message || 'Failed to update');
        return;
      }

      toast.success('Updated');
      cancelEdit();
      await fetchMine();
    } finally {
      setCreating(false);
    }
  }, [editingId, canSubmit, title, purpose, priority, status, reminderStyle, reminderDate, reminderTime, cancelEdit, fetchMine]);

  const onQuickStatusChange = useCallback(async (t: PersonalTask, nextStatus: PersonalTaskStatus) => {
    if (!t?.id) return;
    const res = await personalTaskService.update(t.id, { status: nextStatus });
    if (!res.success) {
      toast.error(res.message || 'Failed to update status');
      return;
    }
    await fetchMine();
  }, [fetchMine]);

  const getPriorityConfig = (priority: string) => {
    switch(priority) {
      case 'high': return { label: 'High', icon: Flag, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
      case 'medium': return { label: 'Medium', icon: Flag, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
      default: return { label: 'Low', icon: Flag, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'completed': return { label: 'Done', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'in-progress': return { label: 'In Progress', icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' };
      default: return { label: 'Pending', icon: Circle, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };


  return (
    <div className="space-y-5">
      

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Create Form - Modern Design */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#3b82f6]/5 to-transparent px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#3b82f6]/10 rounded-lg">
                {editingId ? <Pencil className="h-4 w-4 text-[#3b82f6]" /> : <Sparkles className="h-4 w-4 text-[#3b82f6]" />}
              </div>
              <h3 className="text-sm font-semibold text-black">{editingId ? 'Edit Task' : 'Create New Task'}</h3>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none placeholder:text-gray-400"
            />

            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              placeholder="Why is this important? (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none resize-none placeholder:text-gray-400"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Priority</label>
                <div className="flex gap-2">
                  {['high', 'medium', 'low'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p as PersonalTaskPriority)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${priority === p
                        ? p === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PersonalTaskStatus)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#3b82f6] outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                <Bell className="h-3 w-3 inline mr-1" />
                Reminder
              </label>
              <select
                value={reminderStyle}
                onChange={(e) => setReminderStyle(e.target.value as PersonalTaskReminderStyle)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#3b82f6] outline-none mb-2"
              >
                <option value="none">None</option>
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>

              {reminderStyle === 'once' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3b82f6] outline-none"
                    />
                    <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3b82f6] outline-none"
                    />
                    <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{creatorEmail}</span>
              </div>
              {editingId ? (
                <div className="flex gap-2">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSaveEdit}
                    disabled={!canSubmit || creating}
                    className="px-3 py-1.5 text-xs font-medium bg-[#3b82f6] hover:bg-[#1e3a8a] text-white rounded-lg disabled:opacity-50"
                  >
                    {creating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={onCreate}
                  disabled={!canSubmit || creating}
                  className="px-4 py-1.5 text-xs font-medium bg-[#3b82f6] hover:bg-[#1e3a8a] text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tasks List - Modern Design */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-[#3b82f6]" />
                <h3 className="text-sm font-semibold text-black">Your Tasks</h3>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {['all', 'pending', 'in-progress', 'completed'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as any)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${activeFilter === filter
                      ? 'bg-white text-[#3b82f6] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'in-progress' ? 'In Prog' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 max-h-[480px] overflow-auto space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6] mx-auto" />
                <p className="text-xs text-gray-500 mt-2">Loading...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No tasks found</p>
              </div>
            ) : (
              filteredTasks.map((t) => {
                const priorityConfig = getPriorityConfig(t.priority);
                const statusConfig = getStatusConfig(t.status || 'pending');
                const PriorityIcon = priorityConfig.icon;
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={t.id} className="group bg-white border border-gray-100 rounded-lg p-3 hover:shadow-md hover:border-[#3b82f6]/20 transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-0.5 rounded ${priorityConfig.bg}`}>
                            <PriorityIcon className={`h-3 w-3 ${priorityConfig.color}`} />
                          </div>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${priorityConfig.bg} ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className={`h-2.5 w-2.5 ${t.status === 'in-progress' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </div>
                        </div>
                        <h4 className="font-medium text-sm text-black truncate">{t.title}</h4>
                        {t.purpose && (
                          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{t.purpose}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1 rounded text-gray-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onQuickStatusChange(t, 'in-progress')}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => onQuickStatusChange(t, 'completed')}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
                        >
                          Complete
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>{formatDateTimeSafe(t.createdAt).split(',')[0]}</span>
                        {t.reminderStyle !== 'none' && (
                          <>
                            <Clock className="h-2.5 w-2.5 ml-1" />
                            <span>{t.reminderStyle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Reminder Popup */}
      {reminderPopupTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReminderPopupTask(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a] px-4 py-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-white" />
              <div className="flex-1 text-white font-semibold text-sm">Reminder</div>
              <button
                onClick={() => setReminderPopupTask(null)}
                className="p-1 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="text-base font-semibold text-black">{reminderPopupTask.title}</div>
              {reminderPopupTask.purpose && (
                <div className="text-xs text-gray-600 mt-2">{reminderPopupTask.purpose}</div>
              )}
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg">
                <Calendar className="h-3 w-3" />
                <span>{formatDateTimeSafe(reminderPopupTask.reminderAt)}</span>
              </div>
              <button
                onClick={() => setReminderPopupTask(null)}
                className="w-full mt-4 py-1.5 text-xs font-medium bg-[#3b82f6] hover:bg-[#1e3a8a] text-white rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}