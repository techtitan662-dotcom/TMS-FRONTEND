import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { taskService } from '../Services/Task.services';

type ReviewFilter = 'pending' | 'reviewed' | 'all';

const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase();

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const performanceLevelForAvg = (avgStars: number) => {
  const v = Number(avgStars);
  if (!Number.isFinite(v)) return '—';
  if (v >= 4.5) return 'Excellent';
  if (v >= 4.0) return 'Very Good';
  if (v >= 3.0) return 'Good';
  return 'Needs Improvement';
};

const getPerformanceColor = (performance: string) => {
  switch (performance) {
    case 'Excellent': return 'text-emerald-600 bg-emerald-50';
    case 'Very Good': return 'text-blue-600 bg-blue-50';
    case 'Good': return 'text-amber-600 bg-amber-50';
    case 'Needs Improvement': return 'text-rose-600 bg-rose-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const ReviewsPage = ({ currentUser, users }: { currentUser: UserType; users?: UserType[] }) => {
  const role = useMemo(() => normalizeRole(currentUser?.role), [currentUser?.role]);
  const roleKey = useMemo(() => String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_'), [role]);
  const isSubAssistance = useMemo(() => {
    return roleKey === 'sub_assistance' || roleKey === 'sub_assistence' || roleKey === 'sub_assist' || roleKey === 'sub_assistant';
  }, [roleKey]);
  const isAssistant = useMemo(() => {
    return roleKey === 'assistant';
  }, [roleKey]);
  const canSubmit = useMemo(() => {
    if (role === 'manager' || role === 'marketer_manager' || role === 'md_manager' || role === 'admin' || role === 'super_admin') return true;
    return false;
  }, [role]);
  const canView = useMemo(() => {
    if (role === 'admin' || role === 'super_admin') return true;
    const perms = (currentUser as any)?.permissions;
    if (!perms || typeof perms !== 'object') return true;
    if (Object.keys(perms).length === 0) return true;
    if (typeof (perms as any).reviews_page === 'undefined') return true;
    const perm = String((perms as any).reviews_page || '').trim().toLowerCase();
    if (['deny', 'no', 'false', '0', 'disabled'].includes(perm)) return false;
    if (['allow', 'allowed', 'yes', 'true', '1'].includes(perm)) return true;
    return perm !== 'deny';
  }, [currentUser, role]);

  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const [month, setMonth] = useState<string>(() => monthKeyOfDate(new Date()));

  const [reviewedTasks, setReviewedTasks] = useState<Task[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const [tableStatFilter, setTableStatFilter] = useState<'all' | 'done' | 'pending' | 'reviewed' | 'review_pending'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const normalizeEmailKey = useCallback((v: unknown): string => {
    const raw = String(v || '').trim().toLowerCase();
    if (!raw) return '';
    const base = raw.split('.deleted.')[0];
    return base.trim().toLowerCase();
  }, []);

  const resolveAssigneeEmailKey = useCallback((t: any): string => {
    const raw = (t as any)?.assignedToUser?.email
      || (typeof (t as any)?.assignedTo === 'string' ? (t as any)?.assignedTo : (t as any)?.assignedTo?.email)
      || '';
    return normalizeEmailKey(raw);
  }, [normalizeEmailKey]);

  const assistantAllowedAssigneeKeys = useMemo(() => {
    if (!isAssistant) return [] as string[];

    const me = normalizeEmailKey((currentUser as any)?.email);
    const companyKey = normalizeEmailKey((currentUser as any)?.companyName || (currentUser as any)?.company);

    const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const isSubAssistanceRoleKey = (rk: string): boolean => {
      if (!rk) return false;
      return rk === 'sub_assistance' || rk === 'sub_assistence' || rk === 'sub_assist' || rk === 'sub_assistant';
    };

    const list = Array.isArray(users) ? users : [];
    const subKeys = list
      .filter((u: any) => {
        const rk = normalizeRoleKey(u?.role);
        if (!isSubAssistanceRoleKey(rk)) return false;
        if (!companyKey) return true;
        const uCompanyKey = normalizeEmailKey((u as any)?.companyName || (u as any)?.company);
        return uCompanyKey === companyKey;
      })
      .map((u: any) => normalizeEmailKey(u?.email))
      .filter(Boolean);

    const merged = [me, ...subKeys].filter(Boolean) as string[];
    return Array.from(new Set(merged));
  }, [currentUser, isAssistant, normalizeEmailKey, users]);

  const assistantAllowedAssigneeSet = useMemo(() => {
    return new Set(assistantAllowedAssigneeKeys || []);
  }, [assistantAllowedAssigneeKeys]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { email: string; label: string }>();

    const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const isAssistantRoleKey = (roleKey: string): boolean => {
      if (!roleKey) return false;
      if (roleKey === 'assistant' || roleKey.includes('assistant')) return true;
      return roleKey === 'sub_assistance' || roleKey === 'sub_assistence' || roleKey === 'sub_assist' || roleKey === 'sub_assistant';
    };

    const roleKey = normalizeRoleKey(role);
    const managerOnlyAssistants = roleKey === 'manager' || roleKey === 'marketer_manager' || roleKey === 'md_manager';

    const userRoleKeyByEmail = (emailKey: string): string => {
      if (!emailKey) return '';
      const list = Array.isArray(users) ? users : [];
      const found = list.find((u: any) => normalizeEmailKey(u?.email) === emailKey);
      return normalizeRoleKey((found as any)?.role);
    };

    if (roleKey === 'assistant') {
      const list = Array.isArray(users) ? users : [];
      const getLabel = (emailKey: string): string => {
        const found = list.find((u: any) => normalizeEmailKey(u?.email) === emailKey);
        const name = String((found as any)?.name || '').trim();
        return name ? `${name} (${emailKey})` : emailKey;
      };

      assistantAllowedAssigneeKeys.forEach((emailKey) => {
        if (!emailKey) return;
        map.set(emailKey, { email: emailKey, label: getLabel(emailKey) });
      });
    }

    if ((roleKey === 'manager' || roleKey === 'marketer_manager' || roleKey === 'md_manager') && Array.isArray(users)) {
      (users || []).forEach((u: any) => {
        const emailKey = normalizeEmailKey(u?.email);
        if (!emailKey) return;
        const userRoleKey = normalizeRoleKey(u?.role);
        if (!isAssistantRoleKey(userRoleKey)) return;
        const name = String(u?.name || '').trim();
        const label = name ? `${name} (${emailKey})` : emailKey;
        if (!map.has(emailKey)) map.set(emailKey, { email: emailKey, label });
      });
    }

    (tasks || []).forEach((t: any) => {
      const key = resolveAssigneeEmailKey(t);
      if (!key) return;

      if (managerOnlyAssistants) {
        const taskRoleKey = normalizeRoleKey((t as any)?.assignedToUser?.role);
        const resolvedRoleKey = taskRoleKey || userRoleKeyByEmail(key);
        if (!isAssistantRoleKey(resolvedRoleKey)) return;
      }

      if (roleKey === 'assistant') {
        if (!assistantAllowedAssigneeSet.has(key)) return;
      }

      const assignedToUser = (t as any)?.assignedToUser;
      const name = String(assignedToUser?.name || '').trim();
      const label = name ? `${name} (${key})` : key;
      if (!map.has(key)) map.set(key, { email: key, label });
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [assistantAllowedAssigneeKeys, assistantAllowedAssigneeSet, resolveAssigneeEmailKey, role, tasks, users, normalizeEmailKey]);

  const selectedAssigneeKey = useMemo(() => {
    if (isSubAssistance) {
      const me = normalizeEmailKey((currentUser as any)?.email);
      return me || 'all';
    }

    if (isAssistant) {
      const me = normalizeEmailKey((currentUser as any)?.email);
      const key = normalizeEmailKey(assigneeFilter);
      if (key && key !== 'all') return key;
      return me || 'all';
    }

    const key = normalizeEmailKey(assigneeFilter);
    return key && key !== 'all' ? key : 'all';
  }, [assigneeFilter, currentUser, isSubAssistance, isAssistant, normalizeEmailKey]);

  useEffect(() => {
    if (!isSubAssistance) return;
    const me = normalizeEmailKey((currentUser as any)?.email);
    if (!me) return;
    setAssigneeFilter(me);
  }, [currentUser, isSubAssistance, normalizeEmailKey]);

  useEffect(() => {
    if (!isAssistant) return;
    const me = normalizeEmailKey((currentUser as any)?.email);
    if (!me) return;
    setAssigneeFilter((prev) => {
      const next = normalizeEmailKey(prev);
      if (next && next !== 'all') return prev;
      return me;
    });
  }, [currentUser, isAssistant, normalizeEmailKey]);

  const filteredTasks = useMemo(() => {
    if (isAssistant) {
      const base = (tasks || []).filter((t: any) => assistantAllowedAssigneeSet.has(resolveAssigneeEmailKey(t)));
      if (selectedAssigneeKey === 'all') return base;
      return base.filter((t: any) => resolveAssigneeEmailKey(t) === selectedAssigneeKey);
    }
    if (selectedAssigneeKey === 'all') return tasks;
    return (tasks || []).filter((t: any) => resolveAssigneeEmailKey(t) === selectedAssigneeKey);
  }, [assistantAllowedAssigneeSet, isAssistant, resolveAssigneeEmailKey, selectedAssigneeKey, tasks]);

  const tableTasks = useMemo(() => {
    const list = filteredTasks || [];
    if (tableStatFilter === 'done') {
      return list.filter((t: any) => String(t?.status || '').trim().toLowerCase() === 'completed');
    }
    if (tableStatFilter === 'pending') {
      return list.filter((t: any) => {
        const status = String(t?.status || '').trim().toLowerCase();
        return status !== 'completed' && status !== 'done';
      });
    }
    if (tableStatFilter === 'reviewed') {
      return list.filter((t: any) => (t as any)?.reviewStars != null);
    }
    if (tableStatFilter === 'review_pending') {
      return list.filter((t: any) => {
        const status = String(t?.status || '').trim().toLowerCase();
        const hasReview = (t as any)?.reviewStars != null;
        return (status === 'completed' || status === 'done') && !hasReview;
      });
    }
    return list;
  }, [filteredTasks, tableStatFilter]);

  const paginatedTableTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [tableTasks, currentPage]);

  const totalPages = useMemo(() => Math.ceil(tableTasks.length / itemsPerPage), [tableTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableStatFilter, filter, assigneeFilter]);

  const filteredStats = useMemo(() => {
    const list = filteredTasks || [];
    const done = list.filter((t: any) => {
      const status = String(t?.status || '').trim().toLowerCase();
      return status === 'completed' || status === 'done';
    }).length;
    const pending = list.filter((t: any) => {
      const status = String(t?.status || '').trim().toLowerCase();
      return status !== 'completed' && status !== 'done';
    }).length;
    const reviewed = list.filter((t: any) => (t as any)?.reviewStars != null).length;
    const reviewPending = list.filter((t: any) => {
      const status = String(t?.status || '').trim().toLowerCase();
      const hasReview = (t as any)?.reviewStars != null;
      return (status === 'completed' || status === 'done') && !hasReview;
    }).length;
    return { total: list.length, done, pending, reviewed, reviewPending };
  }, [filteredTasks]);

  const fetchReviews = useCallback(async () => {
    if (!canView) {
      toast.error('Access denied');
      return;
    }

    setLoading(true);
    try {
      const reviewedParam = filter === 'all' ? undefined : (filter === 'reviewed' ? true : false);
      const res = await taskService.getTaskReviews({ reviewed: reviewedParam });
      if (res.success) {
        setTasks(res.data || []);
      } else {
        toast.error(res.message || 'Failed to fetch reviews');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [canView, filter]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const fetchReviewedForSummary = useCallback(async () => {
    if (!canView) return;

    try {
      const res = await taskService.getTaskReviews({ reviewed: true });
      if (res.success) {
        setReviewedTasks(res.data || []);
      }
    } catch {
      return;
    }
  }, [canView]);

  useEffect(() => {
    void fetchReviewedForSummary();
  }, [fetchReviewedForSummary]);

  const monthlySummary = useMemo(() => {
    const parseMonth = (value: string) => {
      const [y, m] = String(value || '').split('-').map((x) => Number(x));
      if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) return null;
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const endExclusive = new Date(y, m, 1, 0, 0, 0, 0);
      return { start, endExclusive };
    };

    const monthRange = parseMonth(month);

    const tasksForMonth = (tasks || []).filter((t: any) => {
      if (!monthRange) return true;
      const createdAtRaw = (t as any).createdAt || (t as any).assignedAt;
      if (!createdAtRaw) return false;
      const createdAt = new Date(createdAtRaw);
      if (Number.isNaN(createdAt.getTime())) return false;
      return createdAt >= monthRange.start && createdAt < monthRange.endExclusive;
    });

    const totalTasksByAssignee = new Map<string, number>();
    tasksForMonth.forEach((t: any) => {
      const key = resolveAssigneeEmailKey(t);
      if (!key) return;
      totalTasksByAssignee.set(key, (totalTasksByAssignee.get(key) || 0) + 1);
    });

    const reviewed = (reviewedTasks || []).filter((t) => {
      const stars = (t as any).reviewStars;
      const reviewedAtRaw = (t as any).reviewedAt;
      if (stars == null) return false;
      if (!reviewedAtRaw) return false;
      if (!monthRange) return true;
      const reviewedAt = new Date(reviewedAtRaw);
      if (Number.isNaN(reviewedAt.getTime())) return false;
      return reviewedAt >= monthRange.start && reviewedAt < monthRange.endExclusive;
    });

    const filteredReviewed = selectedAssigneeKey === 'all'
      ? reviewed
      : reviewed.filter((t: any) => resolveAssigneeEmailKey(t) === selectedAssigneeKey);

    const byAssignee = new Map<string, {
      email: string;
      name: string;
      total: number;
      starSum: number;
      stars: Record<number, number>;
    }>();

    filteredReviewed.forEach((t) => {
      const assignedToUser = (t as any)?.assignedToUser;
      const email = String(
        assignedToUser?.email
        || (typeof t.assignedTo === 'string' ? t.assignedTo : (t.assignedTo as any)?.email)
        || ''
      ).trim().toLowerCase();
      if (!email) return;
      if (email.includes('.deleted.')) return;

      const name = String(assignedToUser?.name || email);
      const starsValue = Number((t as any).reviewStars);
      if (!Number.isFinite(starsValue) || starsValue < 1 || starsValue > 5) return;

      if (monthRange) {
        const createdAtRaw = (t as any).createdAt || (t as any).assignedAt;
        if (!createdAtRaw) return;
        const createdAt = new Date(createdAtRaw);
        if (Number.isNaN(createdAt.getTime())) return;
        if (createdAt < monthRange.start || createdAt >= monthRange.endExclusive) return;
      }

      const existing = byAssignee.get(email) || {
        email,
        name,
        total: 0,
        starSum: 0,
        stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
      };

      existing.total += 1;
      existing.starSum += starsValue;
      existing.stars[starsValue] = (existing.stars[starsValue] || 0) + 1;
      byAssignee.set(email, existing);
    });

    const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const isAssistantRoleKey = (rk: string): boolean => {
      if (!rk) return false;
      const validRoles = ['assistant', 'sub_assistance', 'sub_assistence', 'sub_assist', 'sub_assistant'];
      return validRoles.includes(rk);
    };

    const fullAssistanceList = new Map<string, { email: string; name: string; roleKey: string }>();
    if (Array.isArray(users)) {
      users.forEach((u: any) => {
        const emailKey = normalizeEmailKey(u?.email);
        if (!emailKey || emailKey.includes('.deleted.')) return;
        const roleKey = normalizeRoleKey(u?.role);
        if (!isAssistantRoleKey(roleKey)) return;
        const name = String(u?.name || emailKey);
        fullAssistanceList.set(emailKey, { email: emailKey, name, roleKey });
      });
    }

    const rows: Array<{
      email: string;
      name: string;
      total: number;
      starSum: number;
      stars: Record<number, number>;
      totalTasks: number;
    }> = [];

    fullAssistanceList.forEach((info, email) => {
      const reviewData = byAssignee.get(email);
      rows.push({
        email,
        name: info.name,
        total: reviewData?.total || 0,
        starSum: reviewData?.starSum || 0,
        stars: reviewData?.stars || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalTasks: totalTasksByAssignee.get(email) || 0,
      });
    });
    const totalReviews = rows.reduce((sum, r) => sum + r.total, 0);
    const toPct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
    const formatPct = (v: number) => `${v.toFixed(1)}%`;
    const formatStars = (v: number) => `${v.toFixed(1)}`;

    const mapped = rows
      .map((r) => {
        const sharePct = toPct(r.total, totalReviews);
        const avgStars = r.total > 0 ? (r.starSum / r.total) : 0;
        const ratingPct = toPct(r.starSum, r.total * 5);
        const performance = performanceLevelForAvg(avgStars);
        const starPct = {
          5: toPct(r.stars[5] || 0, r.total),
          4: toPct(r.stars[4] || 0, r.total),
          3: toPct(r.stars[3] || 0, r.total),
          2: toPct(r.stars[2] || 0, r.total),
          1: toPct(r.stars[1] || 0, r.total),
        };
        return {
          ...r,
          sharePct,
          sharePctLabel: formatPct(sharePct),
          avgStars,
          avgStarsLabel: formatStars(avgStars),
          ratingPct,
          ratingPctLabel: formatPct(ratingPct),
          performance,
          starPct,
          starPctLabel: {
            5: formatPct(starPct[5]),
            4: formatPct(starPct[4]),
            3: formatPct(starPct[3]),
            2: formatPct(starPct[2]),
            1: formatPct(starPct[1]),
          }
        };
      })
      .sort((a, b) => (b.sharePct - a.sharePct) || (b.total - a.total) || a.name.localeCompare(b.name));

    const topEmail = mapped[0]?.email || null;
    return {
      totalReviews,
      rows: mapped,
      topEmail,
    };
  }, [tasks, users, month, normalizeEmailKey, resolveAssigneeEmailKey, reviewedTasks, selectedAssigneeKey]);

  const startEdit = (t: Task) => {
    setEditingId(t.id);
    setStars(Number((t as any).reviewStars || 5));
    setComment(String((t as any).reviewComment || ''));
  };

  const submit = async () => {
    if (!editingId) return;
    if (!canSubmit) {
      toast.error('You do not have permission to submit reviews');
      return;
    }

    const s = Number(stars);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      toast.error('Stars must be between 1 and 5');
      return;
    }

    setLoading(true);
    try {
      const res = await taskService.submitTaskReview(editingId, { reviewStars: s, reviewComment: comment });
      if (res.success) {
        toast.success('Review saved');
        setEditingId(null);
        setComment('');
        setStars(5);
        await fetchReviews();
      } else {
        toast.error(res.message || 'Failed to save review');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6-4h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2zm10-10V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m6 0H8" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-[#0f2a6e] to-[#1e3a8a] rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reviews Dashboard</h1>
            <p className="text-[#60a5fa] mt-1 text-sm">Rate and review completed tasks</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-white border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-[#60a5fa]"
                disabled={loading}
              />
            </div>
            {!isSubAssistance && (roleKey === 'manager' || roleKey === 'marketer_manager' || roleKey === 'md_manager' || roleKey === 'admin' || roleKey === 'super_admin' || roleKey === 'ob_manager' || roleKey === 'assistant') ? (
              <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="bg-transparent text-white border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-[#60a5fa]"
                  disabled={loading}
                >
                  {roleKey !== 'assistant' ? (
                    <option value="all" className="text-gray-900">All assistance</option>
                  ) : null}
                  {assigneeOptions.map((o) => (
                    <option key={o.email} value={o.email} className="text-gray-900">{o.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ReviewFilter)}
                className="bg-transparent text-white border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-[#60a5fa]"
                disabled={loading}
              >
                <option value="pending" className="text-gray-900">Pending reviews</option>
                <option value="reviewed" className="text-gray-900">Reviewed</option>
                <option value="all" className="text-gray-900">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button 
            type="button" 
            onClick={() => setTableStatFilter('all')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tableStatFilter === 'all' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
          >
            All ({filteredStats.total})
          </button>
          <button 
            type="button" 
            onClick={() => setTableStatFilter('done')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tableStatFilter === 'done' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
          >
            Done ({filteredStats.done})
          </button>
          <button 
            type="button" 
            onClick={() => setTableStatFilter('pending')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tableStatFilter === 'pending' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
          >
            Pending ({filteredStats.pending})
          </button>
          <button 
            type="button" 
            onClick={() => setTableStatFilter('reviewed')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tableStatFilter === 'reviewed' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
          >
            Reviewed ({filteredStats.reviewed})
          </button>
          <button 
            type="button" 
            onClick={() => setTableStatFilter('review_pending')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tableStatFilter === 'review_pending' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
          >
            Review Pending ({filteredStats.reviewPending})
          </button>
        </div>
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0f2a6e]">Monthly Performance Summary</h3>
              <p className="text-xs text-gray-500 mt-0.5">Based on reviewed tasks only</p>
            </div>
            <div className="px-4 py-2 bg-[#dbeafe] rounded-lg">
              <span className="text-sm text-[#1e3a8a] font-medium">Total Reviews: </span>
              <span className="text-lg font-bold text-[#0f2a6e]">{monthlySummary.totalReviews}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Assistance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Reviews</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Tasks</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Review %</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">⭐ Avg</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Rating %</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Performance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Share</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">5★</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">4★</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">3★</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">2★</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">1★</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthlySummary.rows.map((r) => {
                const isTop = monthlySummary.topEmail && monthlySummary.topEmail === r.email;
                const totalTasks = Number((r as any).totalTasks || 0);
                const avgTaskReviewPct = totalTasks > 0 ? (Number(r.total || 0) / totalTasks) * 100 : 0;
                const performanceColor = getPerformanceColor(r.performance);
                return (
                  <tr key={r.email} className={`${isTop ? 'bg-[#dbeafe]/30' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{r.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{r.total}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{totalTasks}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {`${avgTaskReviewPct.toFixed(0)}%`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-amber-600">{r.avgStarsLabel}</span>
                      <span className="text-xs text-gray-400">/5</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${r.ratingPct}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{r.ratingPctLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${performanceColor}`}>
                        {r.performance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{r.sharePctLabel}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{r.stars[5] || 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{r.stars[4] || 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{r.stars[3] || 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{r.stars[2] || 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{r.stars[1] || 0}</td>
                  </tr>
                );
              })}

              {monthlySummary.rows.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={13}>
                    {loading ? 'Loading...' : 'No reviewed tasks found for selected month'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-semibold text-[#0f2a6e]">Task Reviews</h3>
          <p className="text-xs text-gray-500 mt-0.5">Rate completed tasks to provide feedback</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Task</th>
                {roleKey === 'ob_manager' && <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Assignee</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Creator</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Stars</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Comment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Reviewed At</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedTableTasks.map((t) => {
                const reviewedStars = (t as any).reviewStars;
                const isReviewed = reviewedStars != null;
                const isEditing = editingId === t.id;

                const assigneeEmailRaw = (t as any)?.assignedToUser?.email || (typeof t.assignedTo === 'string' ? t.assignedTo : (t.assignedTo as any)?.email) || '';
                const creatorEmailRaw = (t as any)?.assignedByUser?.email || (typeof t.assignedBy === 'string' ? t.assignedBy : (t.assignedBy as any)?.email) || '';
                const assigneeEmail = String(assigneeEmailRaw || '').split('.deleted.')[0];
                const creatorEmail = String(creatorEmailRaw || '').split('.deleted.')[0];
                const reviewComment = String((t as any).reviewComment || '').trim();

                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{t.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</div>
                    </td>
                    {roleKey === 'ob_manager' && <td className="px-4 py-3 text-sm text-gray-600">{assigneeEmail || '—'}</td>}
                    <td className="px-4 py-3 text-sm text-gray-600">{creatorEmail || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isReviewed ? (
                        <div className="flex items-center justify-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < reviewedStars ? 'text-[#0f2a6e] fill-[#0f2a6e]' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{reviewComment || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{(t as any).reviewedAt ? new Date((t as any).reviewedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {canSubmit ? (
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm font-medium rounded-lg text-[#1e3a8a] border border-[#3b82f6] hover:bg-[#dbeafe] transition-colors"
                          onClick={() => startEdit(t)}
                          disabled={loading}
                        >
                          {isReviewed ? 'Edit' : 'Review'}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}

                      {isEditing && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                            <h4 className="text-lg font-semibold text-[#0f2a6e] mb-4">Review Task</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5 stars)</label>
                                <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => setStars(n)}
                                      className={`p-2 rounded-lg transition-all ${stars === n ? 'bg-[#3b82f6] text-white scale-110' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                <textarea
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-sm"
                                  rows={3}
                                  placeholder="Add your feedback here..."
                                  disabled={loading}
                                />
                              </div>

                              <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                  type="button"
                                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                                  onClick={() => setEditingId(null)}
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-[#1e3a8a] hover:bg-[#0f2a6e] transition-colors disabled:opacity-50"
                                  onClick={() => submit()}
                                  disabled={loading}
                                >
                                  Save Review
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedTableTasks.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={roleKey === 'ob_manager' ? 8 : 7}>
                    {loading ? 'Loading...' : 'No tasks found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, tableTasks.length)} of {tableTasks.length} reviews
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;