import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Star,
  MessageSquare,
  Users,
  RefreshCw,
  Calendar,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCircle2,
  Search,
  X,
  Filter,
  ArrowUpDown,
  CheckCircle,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { subscribeToAllFeedbacks, Feedback } from '../../../services/feedbackService';
import { useOffices } from '../../../hooks/useOffices';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

/** Bilang ng offices na ipapakita bago ang "View all" */
const OFFICE_PREVIEW_COUNT = 5;

/** Helper: hex → rgba para sa soft background */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(156, 163, 175, ${alpha})`;
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  /* ✅ Office dropdown search */
  const [officeDropdownOpen, setOfficeDropdownOpen] = useState(false);
  const [officeSearchText, setOfficeSearchText] = useState('');
  const officeDropdownRef = useRef<HTMLDivElement>(null);

  /* ✅ Show all offices toggle sa Reviews per Office section */
  const [showAllOffices, setShowAllOffices] = useState(false);

  const { offices, loading: officesLoading } = useOffices();

  /* Close dropdown kapag click sa labas */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        officeDropdownRef.current &&
        !officeDropdownRef.current.contains(e.target as Node)
      ) {
        setOfficeDropdownOpen(false);
        setOfficeSearchText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllFeedbacks(
      (data) => {
        setFeedbacks(data);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const getOfficeName = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    return office ? office.name : 'Unknown Office';
  };

  const getAnonymousLabel = (userId: string) => {
    if (!userId) return 'Anonymous';
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0;
    }
    const num = Math.abs(hash) % 10000;
    return `User #${num.toString().padStart(4, '0')}`;
  };

  const selectedOffice = offices.find((o) => o.id === officeFilter);

  const filteredOfficeOptions = useMemo(() => {
    const q = officeSearchText.trim().toLowerCase();
    if (!q) return offices;
    return offices.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.nameFilipino.toLowerCase().includes(q) ||
        o.shortName.toLowerCase().includes(q) ||
        o.floor.toLowerCase().includes(q)
    );
  }, [offices, officeSearchText]);

  /* Matching offices based sa search text */
  const matchingOffices = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return offices.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.nameFilipino.toLowerCase().includes(q) ||
        o.shortName.toLowerCase().includes(q) ||
        o.floor.toLowerCase().includes(q)
    );
  }, [offices, searchText]);

  /* Feedback count per office */
  const feedbackCountByOffice = useMemo(() => {
    const map = new Map<string, { count: number; ratingSum: number }>();
    feedbacks.forEach((fb) => {
      if (!fb.officeId) return;
      const cur = map.get(fb.officeId) || { count: 0, ratingSum: 0 };
      cur.count += 1;
      cur.ratingSum += fb.rating || 0;
      map.set(fb.officeId, cur);
    });
    return map;
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];

    if (officeFilter !== 'all') {
      list = list.filter((fb) => fb.officeId === officeFilter);
    }

    if (ratingFilter !== 'all') {
      list = list.filter((fb) => fb.rating >= (ratingFilter as number));
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter((fb) => {
        const label = getAnonymousLabel(fb.userId).toLowerCase();
        const comment = (fb.comment || '').toLowerCase();
        const office = getOfficeName(fb.officeId).toLowerCase();
        return label.includes(q) || comment.includes(q) || office.includes(q);
      });
    }

    list.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0;
      const tb = b.createdAt?.seconds ?? 0;
      if (sortBy === 'newest') return tb - ta;
      if (sortBy === 'oldest') return ta - tb;
      if (sortBy === 'highest') return b.rating - a.rating || tb - ta;
      return a.rating - b.rating || tb - ta;
    });

    return list;
  }, [feedbacks, searchText, ratingFilter, officeFilter, sortBy, offices]);

  const hasActiveFilter =
    searchText.trim() !== '' || ratingFilter !== 'all' || officeFilter !== 'all';

  const clearFilters = () => {
    setSearchText('');
    setRatingFilter('all');
    setOfficeFilter('all');
    setSortBy('newest');
    setOfficeSearchText('');
    setOfficeDropdownOpen(false);
  };

  const averageRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length).toFixed(1)
      : '0.0';

  const uniqueUsersCount = new Set(feedbacks.map((f) => f.userId)).size;

  /* officeStats — kasama na ang iconBg */
  const officeStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; ratingSum: number; iconBg: string; name: string }
    >();

    offices.forEach((o) => {
      map.set(o.id, {
        count: 0,
        ratingSum: 0,
        iconBg: o.iconBg || '#F97316',
        name: o.name,
      });
    });

    feedbacks.forEach((fb) => {
      if (!fb.officeId) return;
      const cur = map.get(fb.officeId);
      if (!cur) {
        map.set(fb.officeId, {
          count: 1,
          ratingSum: fb.rating || 0,
          iconBg: '#9CA3AF',
          name: getOfficeName(fb.officeId),
        });
        return;
      }
      cur.count += 1;
      cur.ratingSum += fb.rating || 0;
    });

    return Array.from(map.entries())
      .map(([officeId, { count, ratingSum, iconBg, name }]) => ({
        officeId,
        officeName: name,
        iconBg,
        count,
        avg: count > 0 ? (ratingSum / count).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [feedbacks, offices]);

  /* ✅ Preview: 5 offices lang by default */
  const displayedOfficeStats = useMemo(() => {
    if (showAllOffices) return officeStats;
    return officeStats.slice(0, OFFICE_PREVIEW_COUNT);
  }, [officeStats, showAllOffices]);

  const hiddenOfficesCount = officeStats.length - displayedOfficeStats.length;
  const canShowMore = !showAllOffices && officeStats.length > OFFICE_PREVIEW_COUNT;
  const canShowLess = showAllOffices && officeStats.length > OFFICE_PREVIEW_COUNT;

  const maxOfficeCount = Math.max(...officeStats.map((o) => o.count), 1);
  const topOffice = officeStats[0] || {
    officeName: '—',
    count: 0,
    avg: '0.0',
    iconBg: '#F97316',
  };

  const expandedFeedbacks = useMemo(() => {
    if (!expandedOfficeId) return [];
    return feedbacks
      .filter((fb) => fb.officeId === expandedOfficeId)
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  }, [feedbacks, expandedOfficeId]);

  const toggleOffice = (officeId: string) => {
    setExpandedOfficeId((prev) => (prev === officeId ? null : officeId));
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    feedbacks.forEach((fb) => {
      const secs = fb.createdAt?.seconds;
      if (secs) years.add(new Date(secs * 1000).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [feedbacks]);

  const monthlyTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    const ratings = new Array(12).fill(0);

    feedbacks.forEach((fb) => {
      const secs = fb.createdAt?.seconds;
      if (!secs) return;
      const d = new Date(secs * 1000);
      if (d.getFullYear() !== selectedYear) return;
      totals[d.getMonth()] += 1;
      ratings[d.getMonth()] += fb.rating;
    });

    return totals.map((count, i) => ({
      month: MONTH_LABELS[i],
      count,
      avg: count > 0 ? (ratings[i] / count).toFixed(1) : '0.0',
    }));
  }, [feedbacks, selectedYear]);

  const yearTotal = monthlyTotals.reduce((sum, m) => sum + m.count, 0);
  const maxMonthCount = Math.max(...monthlyTotals.map((m) => m.count), 1);
  const bestMonth = monthlyTotals.reduce(
    (best, m) => (m.count > best.count ? m : best),
    { month: '—', count: 0, avg: '0.0' }
  );

  const timeAgo = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    const seconds =
      typeof createdAt === 'object' && 'seconds' in createdAt
        ? createdAt.seconds
        : Math.floor(new Date(createdAt).getTime() / 1000);
    if (!seconds) return 'Just now';
    const diff = Math.floor(Date.now() / 1000) - seconds;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(seconds * 1000).toLocaleDateString();
  };

  const FeedbackCard = ({ fb }: { fb: Feedback }) => (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
            <UserCircle2 size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-700 truncate">
              {getAnonymousLabel(fb.userId)}
            </p>
            <p className="text-[9px] text-gray-400 flex items-center gap-1">
              <Clock size={8} />
              {timeAgo(fb.createdAt)}
              {fb.createdAt?.seconds && (
                <>
                  <span>·</span>
                  <span>{new Date(fb.createdAt.seconds * 1000).toLocaleString()}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={11}
              className={i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
            />
          ))}
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mb-1 pl-9 font-medium">
        {getOfficeName(fb.officeId)}
      </p>
      <p className="text-[11px] text-gray-600 leading-relaxed italic pl-9">
        "{fb.comment || 'No comment'}"
      </p>
    </div>
  );

  const MatchingOfficeCard = ({
    office,
  }: {
    office: (typeof offices)[number];
  }) => {
    const stat = feedbackCountByOffice.get(office.id || '');
    const count = stat?.count || 0;
    const avg =
      count > 0 ? ((stat!.ratingSum || 0) / count).toFixed(1) : '0.0';

    return (
      <button
        onClick={() => setOfficeFilter(office.id || 'all')}
        className="w-full bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-orange-300 hover:shadow-sm transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: office.iconBg }}
          >
            {office.shortName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
              {office.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-gray-400 truncate">{office.floor}</p>
              <span className="text-gray-300">·</span>
              {count > 0 ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[11px] font-semibold text-gray-700">
                    {avg}
                  </span>
                  <span className="text-[11px] text-gray-400">({count})</span>
                </div>
              ) : (
                <span className="text-[11px] text-gray-300 italic">
                  No feedback yet
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
        <p className="text-sm">Loading feedbacks...</p>
      </div>
    );
  }

  const totalResults = matchingOffices.length + filteredFeedbacks.length;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={16} className="text-white sm:hidden" />
            <MessageSquare size={20} className="text-white hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">
              {feedbacks.length}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">Total Feedbacks</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <Star size={16} className="text-white sm:hidden" />
            <Star size={20} className="text-white hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">
              {averageRating}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">Average Rating</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-white sm:hidden" />
            <Users size={20} className="text-white hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">
              {uniqueUsersCount}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">Unique Users</p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 relative z-30">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search offices, comments, or users..."
            className="w-full pl-9 pr-9 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
            <Star size={12} className="text-yellow-500" />
            <select
              value={ratingFilter}
              onChange={(e) =>
                setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="text-[11px] text-gray-700 bg-transparent focus:outline-none"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4★ & up</option>
              <option value="3">3★ & up</option>
              <option value="2">2★ & up</option>
              <option value="1">1★ & up</option>
            </select>
          </div>

          <div ref={officeDropdownRef} className="relative z-50">
            <button
              type="button"
              onClick={() => setOfficeDropdownOpen((v) => !v)}
              className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-2 transition-colors ${
                officeFilter !== 'all'
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter
                size={12}
                className={officeFilter !== 'all' ? 'text-orange-500' : 'text-gray-400'}
              />
              <span className="text-[11px] max-w-[180px] truncate">
                {selectedOffice ? selectedOffice.name : 'All Offices'}
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform ${officeDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {officeDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden"
                style={{ maxHeight: '70vh' }}
              >
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      autoFocus
                      value={officeSearchText}
                      onChange={(e) => setOfficeSearchText(e.target.value)}
                      placeholder="Search office..."
                      className="w-full pl-8 pr-7 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    {officeSearchText && (
                      <button
                        onClick={() => setOfficeSearchText('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                    {filteredOfficeOptions.length} office
                    {filteredOfficeOptions.length !== 1 ? 's' : ''}
                    {officeSearchText.trim() ? ' match' : ' available'}
                  </p>
                </div>

                <div className="max-h-72 overflow-y-auto py-1">
                  <button
                    onClick={() => {
                      setOfficeFilter('all');
                      setOfficeDropdownOpen(false);
                      setOfficeSearchText('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      officeFilter === 'all'
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>All Offices</span>
                    {officeFilter === 'all' && (
                      <CheckCircle size={13} className="text-orange-500" />
                    )}
                  </button>

                  {officesLoading ? (
                    <p className="text-center text-xs text-gray-400 py-4">
                      Loading offices…
                    </p>
                  ) : offices.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">
                      No offices available. Add offices first.
                    </p>
                  ) : filteredOfficeOptions.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">
                      No office matches "{officeSearchText}"
                    </p>
                  ) : (
                    filteredOfficeOptions.map((o) => {
                      const isSelected = officeFilter === o.id;
                      return (
                        <button
                          key={o.id}
                          onClick={() => {
                            setOfficeFilter(o.id);
                            setOfficeDropdownOpen(false);
                            setOfficeSearchText('');
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors ${
                            isSelected
                              ? 'bg-orange-50 text-orange-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: o.iconBg || '#F97316' }}
                            >
                              {o.shortName?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate">{o.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {o.floor}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle
                              size={13}
                              className="text-orange-500 flex-shrink-0"
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
            <ArrowUpDown size={12} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-[11px] text-gray-700 bg-transparent focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-2 hover:bg-orange-100 font-semibold"
            >
              <X size={11} /> Clear
            </button>
          )}

          {hasActiveFilter && (
            <span className="text-[11px] text-gray-400 ml-auto">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtered Results */}
      {hasActiveFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          {matchingOffices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Matching Offices
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {matchingOffices.length} office
                    {matchingOffices.length !== 1 ? 's' : ''} match "{searchText}"
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {matchingOffices.map((office) => (
                  <MatchingOfficeCard key={office.id} office={office} />
                ))}
              </div>
            </div>
          )}

          {matchingOffices.length > 0 && filteredFeedbacks.length > 0 && (
            <div className="border-t border-gray-100 pt-2" />
          )}

          {filteredFeedbacks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Matching Feedbacks
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {filteredFeedbacks.length} feedback
                    {filteredFeedbacks.length !== 1 ? 's' : ''} match your search
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {filteredFeedbacks.map((fb) => (
                  <FeedbackCard key={fb.id} fb={fb} />
                ))}
              </div>
            </div>
          )}

          {matchingOffices.length === 0 && filteredFeedbacks.length === 0 && (
            <div className="text-center py-12">
              <Search size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">
                Walang tumugmang office o feedback.
              </p>
              <button
                onClick={clearFilters}
                className="mt-3 text-[11px] text-orange-600 font-semibold hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reviews per Office — may View all toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <BarChart3 size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Reviews per Office</p>
              <p className="text-[11px] text-gray-400">
                I-click ang opisina para makita ang lahat ng comments
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Top Office</p>
            <p className="text-xs font-bold text-blue-600 truncate max-w-[140px]">
              {topOffice.officeName}
            </p>
          </div>
        </div>

        {officeStats.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Wala pang opisina o feedback na na-record.
          </p>
        ) : (
          <>
            {/* ✅ Counter kung naka-preview */}
            {officeStats.length > OFFICE_PREVIEW_COUNT && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-gray-400">
                  {showAllOffices
                    ? `Showing all ${officeStats.length} offices`
                    : `Showing top ${displayedOfficeStats.length} of ${officeStats.length} offices`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              {displayedOfficeStats.map((o, idx) => {
                const pct = maxOfficeCount > 0 ? (o.count / maxOfficeCount) * 100 : 0;
                const isZero = o.count === 0;
                const isExpanded = expandedOfficeId === o.officeId;
                const officeColor = isZero ? '#D1D5DB' : o.iconBg;

                return (
                  <div
                    key={o.officeId}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'border-blue-200 bg-blue-50/40'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => toggleOffice(o.officeId)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white"
                            style={{ backgroundColor: officeColor }}
                          >
                            {idx + 1}
                          </span>
                          <p
                            className={`text-xs font-semibold truncate ${
                              isZero ? 'text-gray-400' : 'text-gray-700'
                            }`}
                          >
                            {o.officeName}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Star
                              size={11}
                              className={
                                isZero ? 'text-gray-200' : 'text-yellow-400 fill-yellow-400'
                              }
                            />
                            <span
                              className={`text-[11px] font-bold ${
                                isZero ? 'text-gray-300' : 'text-gray-700'
                              }`}
                            >
                              {o.avg}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold min-w-[28px] text-right ${
                              isZero ? 'text-gray-300' : 'text-gray-800'
                            }`}
                          >
                            {o.count}
                          </span>
                          <span className="text-gray-400">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                      </div>

                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, isZero ? 0 : 4)}%`,
                            background: isZero
                              ? '#E5E7EB'
                              : `linear-gradient(90deg, ${hexToRgba(
                                  o.iconBg,
                                  0.65
                                )} 0%, ${o.iconBg} 100%)`,
                          }}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1">
                        {isZero ? (
                          <div className="text-center py-6 bg-white rounded-lg border border-gray-100">
                            <MessageSquare size={22} className="mx-auto text-gray-300 mb-1" />
                            <p className="text-[11px] text-gray-400">
                              Wala pang feedback ang opisinang ito.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {expandedFeedbacks.map((fb) => (
                              <FeedbackCard key={fb.id} fb={fb} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ✅ View all / Show less button */}
            {canShowMore && (
              <button
                onClick={() => setShowAllOffices(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-3 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-[0.99] transition-all"
              >
                <ChevronDown size={14} />
                View all offices ({hiddenOfficesCount} more)
              </button>
            )}

            {canShowLess && (
              <button
                onClick={() => setShowAllOffices(false)}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-100 active:scale-[0.99] transition-all"
              >
                <ChevronUp size={14} />
                Show less
              </button>
            )}
          </>
        )}

        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Offices</p>
            <p className="text-lg font-bold text-gray-800">{officeStats.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">With Reviews</p>
            <p className="text-lg font-bold text-gray-800">
              {officeStats.filter((o) => o.count > 0).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Reviews</p>
            <p className="text-lg font-bold text-orange-600">
              {officeStats.reduce((sum, o) => sum + o.count, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly totals */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Monthly Totals</p>
              <p className="text-[11px] text-gray-400">Feedbacks received per month</p>
            </div>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2 focus:outline-none"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
            <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">
              Total ({selectedYear})
            </p>
            <p className="text-xl font-bold text-orange-700 mt-1">{yearTotal}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide flex items-center gap-1">
              <TrendingUp size={10} /> Best Month
            </p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {bestMonth.month}{' '}
              <span className="text-sm font-medium">({bestMonth.count})</span>
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">
              Monthly Avg
            </p>
            <p className="text-xl font-bold text-blue-700 mt-1">
              {(yearTotal / 12).toFixed(1)}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-1.5 h-40 mb-2">
          {monthlyTotals.map((m, i) => {
            const heightPct = maxMonthCount > 0 ? (m.count / maxMonthCount) * 100 : 0;
            const isBest = m.count > 0 && m.count === bestMonth.count;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap pointer-events-none z-10">
                  {m.month}: {m.count} · ⭐ {m.avg}
                </div>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    m.count === 0
                      ? 'bg-gray-100'
                      : isBest
                      ? 'bg-orange-500'
                      : 'bg-orange-300 group-hover:bg-orange-400'
                  }`}
                  style={{ height: `${Math.max(heightPct, m.count > 0 ? 6 : 2)}%` }}
                />
                {m.count > 0 && (
                  <span className="absolute top-0 text-[9px] font-bold text-gray-500">
                    {m.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-1.5">
          {monthlyTotals.map((m, i) => (
            <div key={i} className="flex-1 text-center">
              <p className="text-[10px] text-gray-500 font-medium">{m.month}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {monthlyTotals.map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                m.count > 0
                  ? 'bg-gray-50 border-gray-100'
                  : 'bg-gray-50/50 border-gray-100 opacity-60'
              }`}
            >
              <span className="font-medium text-gray-600">
                {m.month} {selectedYear}
              </span>
              <div className="flex items-center gap-2">
                {m.count > 0 && (
                  <span className="text-[10px] text-yellow-500 font-semibold">
                    ⭐ {m.avg}
                  </span>
                )}
                <span
                  className={`font-bold ${
                    m.count > 0 ? 'text-orange-600' : 'text-gray-300'
                  }`}
                >
                  {m.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}