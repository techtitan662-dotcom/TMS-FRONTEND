import { useMemo, useRef } from 'react';
import { Star, Download, Users, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import { toAvatarUrl } from '../utils/avatar';
import logo from '../../public/logo (2).png';
import cardBg from '../../public/Marble Iphone Wallpaper • The Best Marble Backgrounds.jpg.jpeg';

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
  headerLeftSlot?: React.ReactNode;
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
  rating,
  performance,
  avg,
  photoUrl,
  monthValue,
  onMonthChange,
  headerLeftSlot,
  totalReviews,
  totalTasksReceived,
  summaryRows = [],
}: EmployeeOfTheMonthCardProps) => {
  clampRating(rating);
  const topAvatarUrl = toAvatarUrl(photoUrl);

  const formatMonthLabel = (value?: string): string => {
    const raw = String(value || '').trim();
    const [y, m] = raw.split('-').map((x) => Number(x));
    if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) {
      return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

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

  const bgImage = cardBg;

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Month Selector and Download Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {headerLeftSlot ? headerLeftSlot : null}
        </div>
        <div className="flex items-center">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="month"
              value={monthValue || ''}
              onChange={(e) => onMonthChange?.(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white/80 text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 backdrop-blur-sm"
            />
          </div>
          <button
            type="button"
            className="ml-3 md:ml-5 p-2 rounded-lg bg-white/50 text-blue-700 hover:bg-white/70 transition-all border border-blue-300 shadow-sm download-btn-to-hide"
            title="Download Card"
            onClick={downloadCard}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* MAIN CARD - With Background Image */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl shadow-md"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: 'auto',
        }}
      >
        {/* Overlay to make content readable */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(230,240,250,0.85) 0%, rgba(204,228,248,0.85) 25%, rgba(179,215,245,0.85) 50%, rgba(153,201,242,0.85) 75%, rgba(128,187,240,0.85) 100%)',
          }}
        />

        {/* Top Full Width Confetti Image - Behind Logo */}
        <div
          className="absolute top-0 left-0 right-0 z-[5] overflow-hidden rounded-t-2xl"
          style={{
            height: '150px',
            backgroundImage: `url('/image (1).png')`,
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'top left',
            backgroundSize: 'auto 150px',
          }}
        />

        {/* Content */}
        <div className="relative p-4 md:p-6 pt-16 md:pt-20 lg:pt-24">
          {/* Top Bar - Mobile: Logo Right, Desktop: Logo Center */}
          <div className="flex items-center justify-between mb-4 md:mb-5">
            {/* Left side text */}
            <div>
              <p className="text-[10px] md:text-xs font-bold text-[#0f2a6e] tracking-wider">
                {formatMonthLabel(monthValue)}
              </p>
              <h3 className="text-sm md:text-xl font-bold text-[#0f2a6e]">{title}</h3>
            </div>
            {/* Logo - Mobile me visible, Desktop me hidden (kyuki desktop me center me hai) */}
            <div className="flex-shrink-0 md:hidden">
              <img src={logo} alt="logo" className="h-24 w-auto opacity-90" />
            </div>
            {/* Desktop me empty div for spacing */}
            <div className="hidden md:block w-12 md:w-16"></div>
          </div>

          {/* Desktop Logo - Center */}
          <div className="hidden md:flex absolute top-4 left-0 right-0 justify-center pointer-events-none">
            <img src={logo} alt="logo" className="h-40 w-auto opacity-90" />
          </div>

          {/* Main Grid - Responsive column layout */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6 items-center">
            {/* Left Column */}
            <div className="space-y-3 md:space-y-5 w-full px-2 md:px-0 order-1">
              {/* Congratulations and Name - Mobile me vertical stacking */}
              <div className="mb-3 md:mb-4">
                <div className="flex flex-col sm:flex-row flex-wrap gap-1 sm:gap-2 items-start sm:items-baseline">
                  <span
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight"
                    style={{
                      color: "#0f2a6e",
                      WebkitTextStroke: "0.5px #daa520",
                      paintOrder: "stroke fill",
                      fontFamily: "'Anek Telugu', serif",
                      fontWeight: "700",
                      letterSpacing: "0.5px"
                    }}
                  >
                    Congratulations
                  </span>
                  <span
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight break-words"
                    style={{
                      color: "#0f2a6e",
                      WebkitTextStroke: "0.5px #daa520",
                      paintOrder: "stroke fill",
                      fontFamily: "'Anek Telugu', serif",
                      fontWeight: "700",
                      letterSpacing: "0.5px"
                    }}
                  >
                    {name}
                  </span>
                </div>
              </div>

              {/* Quote */}
              <p
                className="text-gray-700 text-[10px] sm:text-xs border-l-3 pl-2 italic leading-relaxed bg-white/50 p-2 rounded-sm inline-block w-auto"
                style={{ borderLeftColor: '#3b82f6', borderLeftWidth: '3px' }}
              >
                {performance === 'Excellent'
                  ? '"Exceptional contribution to team productivity and project completion"'
                  : performance === 'Very Good'
                    ? '"Consistent performance meeting all project deadlines with quality output"'
                    : performance === 'Good'
                      ? '"Showing improvement and dedication to tasks with positive attitude"'
                      : '"Continuing to develop skills and contribute to team success"'}
              </p>

              {/* Performance Stats - Responsive grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[400px]">
                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                  <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Performance</p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-800 truncate">{performance}</p>
                </div>
                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                  <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Avg Rating</p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-800">{avg}</p>
                </div>
                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                  <p className="text-[8px] sm:text-[9px] text-blue-600 font-semibold mb-0.5">Review Rate</p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-800">
                    {toNumberSafe(totalReviews) > 0 && toNumberSafe(totalTasksReceived) > 0
                      ? `${((toNumberSafe(totalReviews) / toNumberSafe(totalTasksReceived)) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Profile Image */}
            <div className="relative flex justify-center w-full mt-4 lg:mt-0 order-2">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72">
                {/* Gradient Ring */}
                <div
                  className="absolute inset-0 rounded-full z-[2]"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af, #2563eb, #1e3a8a, #3b82f6)',
                    padding: '3px',
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white" />
                </div>

                {/* Profile Image Container */}
                <div className="absolute inset-1 z-[3]">
                  {topAvatarUrl ? (
                    <img
                      src={topAvatarUrl}
                      alt={name}
                      className="w-full h-full object-cover rounded-full border border-blue-200"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                      <span className="text-blue-600 text-4xl sm:text-5xl font-bold">
                        {(name || 'U').trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Employee of the Month Badge */}
                  {/* Employee of the Month Badge - Mobile view me text wrap hoga */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[75%] sm:w-[75%] z-[5]">
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                      <div className="relative px-2 sm:px-3 py-1.5 rounded-full bg-white border border-blue-100 shadow-md">
                        <div className="text-[9px] sm:text-[13px] font-extrabold text-[#1e3a8a] tracking-wide uppercase text-center whitespace-nowrap sm:whitespace-nowrap">
                          {title && title.trim() ? title : 'Employee of the Month'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-4 md:h-6"></div>
        </div>
      </div>

      {/* TEAM SECTION */}
      {sortedRows.length > 0 && (
        <div className="relative overflow-hidden rounded-xl shadow-sm bg-white border border-blue-200">
          {/* Header */}
          <div className="relative px-4 py-3 sm:px-5 sm:py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-800">Team Performance Dashboard</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Real-time metrics • This month</p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {sortedRows.length} Team Members
              </span>
            </div>
          </div>

          {/* Team Grid */}
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {sortedRows.map((r, index) => {
                const rank = index + 2;
                const isEvenIndex = (index % 2 === 0);
                const cardBgClass = isEvenIndex ? 'bg-blue-50/50' : 'bg-white';
                const rankColors = {
                  2: 'bg-gradient-to-r from-blue-500 to-blue-600',
                  3: 'bg-gradient-to-r from-blue-500 to-blue-600',
                  4: 'bg-gradient-to-r from-blue-500 to-blue-600',
                };
                const rankColor = rank === 2 ? rankColors[2] : rank === 3 ? rankColors[3] : rankColors[4];

                return (
                  <div key={r.email} className="group relative">
                    <div className={`rounded-lg border border-blue-200 p-3 sm:p-4 hover:shadow-md hover:border-blue-300 transition-all duration-300 ${cardBgClass}`}>
                      {/* Rank Badge */}
                      <div
                        className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-sm ${rankColor}`}
                      >
                        #{rank}
                      </div>

                      <div className="flex items-start gap-2 sm:gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-blue-200 bg-white">
                            {toAvatarUrl(r?.avatar) ? (
                              <img
                                src={toAvatarUrl(r?.avatar)}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                <span className="font-bold text-xs sm:text-sm text-blue-600">
                                  {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border border-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 text-xs sm:text-sm mb-0.5 truncate">{r.name}</h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2 truncate">{r.email}</p>

                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-wrap">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${i < Math.floor(Number(r.avgStarsLabel))
                                    ? 'text-blue-500 fill-blue-500'
                                    : i < Number(r.avgStarsLabel)
                                      ? 'text-blue-400 fill-blue-400'
                                      : 'text-gray-300 fill-none'
                                    }`}
                                />
                              ))}
                              <span className="font-medium text-gray-700 ml-0.5 sm:ml-1 text-[10px] sm:text-xs">{r.avgStarsLabel}</span>
                            </div>
                            <span className="text-gray-500 text-[10px] sm:text-xs">
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