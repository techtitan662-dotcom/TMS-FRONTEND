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
    <div className="space-y-5">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
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
            className="ml-5 p-2 mr-4 rounded-lg bg-white/50 text-blue-700 hover:bg-white/70 transition-all border border-blue-300 shadow-sm download-btn-to-hide"
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
        className="relative overflow-hidden rounded-2xl shadow-md w-[1230px] h-[430px]"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
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
            backgroundImage: `url('/image (1).png')`, // Direct public URL
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'top left',
            backgroundSize: 'auto 150px',
            backgroundColor: '', // Test background to see if div is visible
          }}
        />

        {/* Logo - Positioned on top of confetti */}
        <div className="absolute top-4 left-0 right-0 flex justify-center ">
          <img src={logo} alt="logo" className="h-40 w-auto opacity-90" />
        </div>

        {/* Content */}
        <div className="relative  p-6">
          {/* Top Bar - Adjusted spacing */}
          <div className="flex items-center justify-between mb-5 min-h-[100px] mt-10 ml-7">
            <div>
              <p className=" text-xs font-bold text-[#0f2a6e]  tracking-wider mt-10 ">
                {formatMonthLabel(monthValue)}
              </p>
              <h3 className="text-xl font-bold text-[#0f2a6e]">{title}</h3>
            </div>

          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-3 items-center">
            {/* Left Column */}
            <div className="space-y-5  ml-7 mb-30">
              {/* Name & Stars */}
              <div>
                <h1 className="text-1xl lg:text-5xl font-black mb-1 flex flex-wrap items-center gap-3 tracking-tighter ">
                  {/* Congratulations Section - Tall and Elegant */}
                  <span
                    className="tracking-[0rem]"
                    style={{
                      color: "#0f2a6e",
                      WebkitTextStroke: "1px #daa520",
                      paintOrder: "stroke fill",
                      fontFamily: "'Anek Telugu', serif",
                      transform: "scaleY(1.15)",
                      display: "inline-block",
                      fontWeight: "600",
                      letterSpacing: "0.5px"
                    }}
                  >
                    Congratulations
                  </span>

                  {/* Name Section - Same style as Congratulations */}
                  <span
                    className="tracking-[0rem]"
                    style={{
                      color: "#0f2a6e",
                      WebkitTextStroke: "1px #daa520",
                      paintOrder: "stroke fill",
                      fontFamily: "'Anek Telugu', serif",
                      transform: "scaleY(1.15)",
                      display: "inline-block",
                      fontWeight: "600",
                      letterSpacing: "0.5px"
                    }}
                  >
                    {name}
                  </span>
                </h1>
              </div>
              {/* Quote */}
              <p
                className="text-gray-700 text-xs border-l-3 pl-2 italic leading-relaxed bg-white/50 p-2 rounded-sm inline-block w-auto"
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

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-3 w-[400px]">
                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm ">
                  <p className="text-[9px] text-blue-600 font-semibold mb-0.5">Performance</p>
                  <p className="text-[11px] font-bold text-gray-800">{performance}</p>
                </div>
                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                  <p className="text-[9px] text-blue-600 font-semibold mb-0.5">Avg Rating</p>
                  <p className="text-[11px] font-bold text-gray-800">{avg}</p>
                </div>
                <div className="rounded-lg p-1.5 bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm">
                  <p className="text-[9px] text-blue-600 font-semibold mb-0.5">Review Rate</p>
                  <p className="text-[11px] font-bold text-gray-800">
                    {toNumberSafe(totalReviews) > 0 && toNumberSafe(totalTasksReceived) > 0
                      ? `${((toNumberSafe(totalReviews) / toNumberSafe(totalTasksReceived)) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Profile Image */}
            <div className="relative flex justify-center lg:justify-end mr-20">
              <div className="relative w-64 h-64 lg:w-72 lg:h-72" style={{ top: '-100px', right: '10px' }}>

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
                      <span className="text-blue-600 text-5xl font-bold">
                        {(name || 'U').trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Employee of the Month Badge */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[75%] z-[5]">
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                      <div className="relative px-3 py-1.5 rounded-full bg-white border border-blue-100 shadow-md">
                        <div className="text-[13px] font-extrabold text-[#1e3a8a] tracking-wide uppercase truncate">
                          {title && title.trim() ? title : 'Employee of the Month'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

               

              </div>
               {/* Trophy Image - Positioned at bottom right, slightly up */}
                {/* <div className="absolute right-0 bottom-0 translate-x-[50%] -translate-y-[-10%] z-[4]">
                  <img
                    src="../../public/trophy (2).png"
                    alt="trophy"
                    className="w-36 h-36 lg:w-80 lg:h-80 opacity-80"
                    style={{
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                    }}
                  />
                </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* TEAM SECTION */}
      {sortedRows.length > 0 && (
        <div className="relative overflow-hidden rounded-xl shadow-sm bg-white border border-blue-200">
          {/* Header */}
          <div className="relative px-5 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-800">Team Performance Dashboard</h3>
                  <p className="text-xs text-gray-500">Real-time metrics • This month</p>
                </div>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {sortedRows.length} Team Members
              </span>
            </div>
          </div>

          {/* Team Grid */}
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className={`rounded-lg border border-blue-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-300 ${cardBgClass}`}>
                      {/* Rank Badge */}
                      <div
                        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${rankColor}`}
                      >
                        #{rank}
                      </div>

                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-200 bg-white">
                            {toAvatarUrl(r?.avatar) ? (
                              <img
                                src={toAvatarUrl(r?.avatar)}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                <span className="font-bold text-sm text-blue-600">
                                  {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 text-sm mb-0.5 truncate">{r.name}</h4>
                          <p className="text-xs text-gray-500 mb-2 truncate">{r.email}</p>

                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < Math.floor(Number(r.avgStarsLabel))
                                    ? 'text-blue-500 fill-blue-500'
                                    : i < Number(r.avgStarsLabel)
                                      ? 'text-blue-400 fill-blue-400'
                                      : 'text-gray-300 fill-none'
                                    }`}
                                />
                              ))}
                              <span className="font-medium text-gray-700 ml-1">{r.avgStarsLabel}</span>
                            </div>
                            <span className="text-gray-500">
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