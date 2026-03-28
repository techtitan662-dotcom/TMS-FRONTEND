import { useMemo, useRef } from 'react';
import { Star, Download, Users, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import { toAvatarUrl } from '../utils/avatar';

type EmployeeOfTheMonthCardProps = {
  title?: string;
  name: string;
  email?: string;
  rating: number;
  performance: string;
  avg: string;
  photoUrl?: string;
  monthValue?: string;
  onMonthChange?: (value: string) => void;
  totalReviews?: number;
  totalTasksReceived?: number;
  backgroundUrl?: string;
  summaryRows?: Array<{
    email: string;
    name: string;
    avatar?: string;
    avgStarsLabel: string;
    total: number;
    totalTasksReceived?: number;
    performance: string;
    taskStats?: {
      tasksCompleted: number;
      hoursLogged: number;
      efficiency: number;
    };
  }>;
};

const clampRating = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
};

const toNumberSafe = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const parseStarsLabel = (label: unknown): number => {
  const raw = String(label ?? '').trim();
  const m = raw.match(/\d+(?:\.\d+)?/);
  return clampRating(m ? Number(m[0]) : 0);
};

const EmployeeOfTheMonthCard = ({
  title = 'Employee of the Month',
  name,
  email,
  rating,
  performance,
  avg,
  photoUrl,
  monthValue,
  onMonthChange,
  totalReviews,
  totalTasksReceived,
  summaryRows = [],
}: EmployeeOfTheMonthCardProps) => {
  const safeRating = clampRating(rating);
  const topAvatarUrl = toAvatarUrl(photoUrl);

  const remainingRows = useMemo(() => {
    const list = Array.isArray(summaryRows) ? summaryRows : [];
    const topNameKey = String(name || '').trim().toLowerCase();
    return list.filter((r) => {
      if (String(r?.email || '') === '__top_placeholder__') return false;
      if (topNameKey && String(r?.name || '').trim().toLowerCase() === topNameKey) return false;
      return true;
    });
  }, [name, summaryRows]);

  const sortedRows = useMemo(() => {
    const list = Array.isArray(remainingRows) ? remainingRows : [];
    const copy = [...list];
    copy.sort((a, b) => {
      const aReviews = toNumberSafe(a?.total);
      const bReviews = toNumberSafe(b?.total);
      if (aReviews !== bReviews) return bReviews - aReviews;
      const aRating = parseStarsLabel(a?.avgStarsLabel);
      const bRating = parseStarsLabel(b?.avgStarsLabel);
      if (aRating !== bRating) return bRating - aRating;
      const aTasks = toNumberSafe(a?.taskStats?.tasksCompleted);
      const bTasks = toNumberSafe(b?.taskStats?.tasksCompleted);
      if (aTasks !== bTasks) return bTasks - aTasks;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
    return copy;
  }, [remainingRows]);

  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    const toastId = toast.loading('Preparing download...');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: 'white',
        style: { borderRadius: '20px' },
        filter: (node) => {
          const exclusionClasses = ['download-btn-to-hide'];
          return !exclusionClasses.some(cls => (node as HTMLElement).classList?.contains(cls));
        }
      });
      const link = document.createElement('a');
      link.download = `employee-of-the-month-${name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download card', { id: toastId });
    }
  };

  const formatMonthLabel = (value?: string): string => {
    const raw = String(value || '').trim();
    const [y, m] = raw.split('-').map((x) => Number(x));
    if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) {
      return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-5">
      {/* Month Selector */}
      <div className="flex justify-end">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="month"
            value={monthValue || ''}
            onChange={(e) => onMonthChange?.(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* MAIN CARD */}
      <div ref={cardRef} className="relative overflow-hidden rounded-2xl shadow-lg border border-white/20 bg-white">
        {/* Gradient Background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
      linear-gradient(
        135deg,
        #0f2a6e 0%,
        #1e3a8a 25%,
        #3b5cae 45%,
        #3b5cae 55%,
        #1e3a8a 75%,
        #0f2a6e 100%
      )
    `,
          }}
        />

        {/* Soft Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative p-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                {formatMonthLabel(monthValue)}
              </p>
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>
            <button
              type="button"
              className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all border border-white/30 shadow-sm download-btn-to-hide"
              title="Download Card"
              onClick={downloadCard}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Name & Stars */}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-1">
                  <span className="text-white">Congratulations </span>
                  <span className="text-white/90">{name}</span>
                </h1>
                <p className="text-sm text-white/80 mb-2 truncate">{email || ''}</p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < Math.floor(safeRating)
                          ? 'text-amber-300 fill-amber-300'
                          : i < safeRating
                            ? 'text-amber-300 fill-amber-300 opacity-50'
                            : 'text-white/30'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-white">
                    ({safeRating.toFixed(1)}/5)
                  </span>
                </div>
              </div>

              {/* Quote */}
              <p
                className="text-white/80 text-sm border-l-3 pl-3 italic leading-relaxed"
                style={{ borderLeftColor: 'white', borderLeftWidth: '3px' }}
              >
                {performance === 'Excellent'
                  ? '"Exceptional contribution to team productivity and project completion"'
                  : performance === 'Very Good'
                    ? '"Consistent performance meeting all project deadlines with quality output"'
                    : performance === 'Good'
                      ? '"Showing improvement and dedication to tasks with positive attitude"'
                      : '"Continuing to develop skills and contribute to team success"'}
              </p>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white/70 font-semibold mb-1">Performance</p>
                  <p className="text-sm font-bold text-white">{performance}</p>
                </div>
                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white/70 font-semibold mb-1">Avg Rating</p>
                  <p className="text-sm font-bold text-white">{avg}</p>
                </div>
                <div className="rounded-lg p-3 border border-white/30 bg-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white/70 font-semibold mb-1">Review Rate</p>
                  <p className="text-sm font-bold text-white">
                    {toNumberSafe(totalReviews) > 0 && toNumberSafe(totalTasksReceived) > 0
                      ? `${((toNumberSafe(totalReviews) / toNumberSafe(totalTasksReceived)) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Profile Image */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-64 h-64 lg:w-72 lg:h-72">
                {/* Gradient Ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8), rgba(255,255,255,0.4), white)',
                    padding: '3px',
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm" />
                </div>

                {/* Profile Image Container */}
                <div className="absolute inset-1.5 rounded-full overflow-hidden border-2 border-white/30">
                  {topAvatarUrl ? (
                    <img
                      src={topAvatarUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/20 to-white/10">
                      <span className="text-white text-5xl font-bold">
                        {(name || 'U').trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Champion Badge */}
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold border shadow-sm bg-white/20 backdrop-blur-sm border-white/30 text-white">
                      🏆 EMPLOYEE OF THE MONTH 🏆
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* TEAM SECTION */}
      {sortedRows.length > 0 && (
        <div className="relative overflow-hidden rounded-xl shadow-md bg-white border border-[#3b82f6]/20">
          {/* Header */}
          <div className="relative px-5 py-4 border-b border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#3b82f6]/10">
                  <Users className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-black">Team Performance Dashboard</h3>
                  <p className="text-xs text-[#00000]">Real-time metrics • This month</p>
                </div>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                {sortedRows.length} Team Members
              </span>
            </div>
          </div>

          {/* Team Grid */}
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedRows.map((r, index) => {
                const rank = index + 2;
                const rankColors = {
                  2: 'bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a]',
                  3: 'bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a]',
                  4: 'bg-gradient-to-r from-[#3b82f6] to-[#1e3a8a]',
                };
                const rankColor = rank === 2 ? rankColors[2] : rank === 3 ? rankColors[3] : rankColors[4];

                return (
                  <div key={r.email} className="group relative">
                    <div className="rounded-lg border border-[#3b82f6]/20 p-4 hover:shadow-md hover:border-[#3b82f6] transition-all duration-300 bg-white">
                      {/* Rank Badge */}
                      <div
                        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${rankColor}`}
                      >
                        #{rank}
                      </div>

                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#3b82f6]/20">
                            {toAvatarUrl(r?.avatar) ? (
                              <img
                                src={toAvatarUrl(r?.avatar)}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#3b82f6]/10">
                                <span className="font-bold text-sm text-[#3b82f6]">
                                  {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-black text-sm mb-0.5 truncate">{r.name}</h4>
                          <p className="text-xs text-[#000000] mb-2 truncate">{r.email}</p>

                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < Math.floor(Number(r.avgStarsLabel))
                                      ? 'text-[#3b82f6] fill-[#3b82f6]'
                                      : i < Number(r.avgStarsLabel)
                                        ? 'text-[#3b82f6] fill-[#3b82f6] opacity-50'
                                        : 'text-gray-300 fill-none'
                                    }`}
                                />
                              ))}
                              <span className="font-medium text-black ml-1">{r.avgStarsLabel}</span>
                            </div>
                            <span className="text-[#000000]">
                              {toNumberSafe(r.total) > 0 && toNumberSafe(r.totalTasksReceived) > 0
                                ? `${((toNumberSafe(r.total) / toNumberSafe(r.totalTasksReceived)) * 100).toFixed(0)}%`
                                : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeOfTheMonthCard;