import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { formatDate } from '../utils';
import type {
  TimePerProject,
  WeeklyCompletion,
  CompletionRate,
  StreakData,
} from '../types';

type RangeKey = '7d' | '30d' | '90d' | 'all';

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'all', label: 'All', days: null },
];

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDateRange(rangeKey: RangeKey): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = formatDate(today);

  if (rangeKey === 'all') {
    return { startDate: '2000-01-01', endDate };
  }

  const option = RANGE_OPTIONS.find((o) => o.key === rangeKey)!;
  const start = new Date(today);
  start.setDate(start.getDate() - (option.days! - 1));
  return { startDate: formatDate(start), endDate };
}

export default function StatsDashboard() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [timePerProject, setTimePerProject] = useState<TimePerProject[]>([]);
  const [weeklyCompletion, setWeeklyCompletion] = useState<WeeklyCompletion[]>([]);
  const [completionRate, setCompletionRate] = useState<CompletionRate | null>(null);
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const { startDate, endDate } = useMemo(() => getDateRange(range), [range]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tpp, wc, cr, sk] = await Promise.all([
        window.api.getTimePerProject({ startDate, endDate }),
        window.api.getCompletedPerWeek({ startDate, endDate }),
        window.api.getCompletionRate({ startDate, endDate }),
        window.api.getStreaks(),
      ]);
      setTimePerProject(tpp);
      setWeeklyCompletion(wc);
      setCompletionRate(cr);
      setStreaks(sk);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ratePercent = completionRate ? Math.round(completionRate.rate * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-1">
          Range:
        </span>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              range === opt.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-500">
          Loading statistics...
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tasks */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Tasks
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {completionRate ? completionRate.completed : 0}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {' '}
                  / {completionRate ? completionRate.total : 0}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                completed
              </p>
            </div>

            {/* Completion Rate */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Completion Rate
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {ratePercent}%
              </p>
              <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${ratePercent}%` }}
                />
              </div>
            </div>

            {/* Current Streak */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Current Streak
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {streaks ? streaks.currentStreak : 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                days
              </p>
            </div>

            {/* Longest Streak */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Longest Streak
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {streaks ? streaks.longestStreak : 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                days
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time per Project - Bar Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Time per Project
              </h3>
              {timePerProject.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-500 py-8 text-center">
                  No project time data for this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, timePerProject.length * 40)}>
                  <BarChart
                    layout="vertical"
                    data={timePerProject}
                    margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => formatTime(v)}
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="project_name"
                      width={100}
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatTime(value), 'Time']}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '0.5rem',
                        color: '#e2e8f0',
                        fontSize: '0.875rem',
                      }}
                    />
                    <Bar
                      dataKey="total_time"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={24}
                      fill="#3b82f6"
                      // Use per-item color if available
                      isAnimationActive={true}
                      shape={(props: Record<string, unknown>) => {
                        const { x, y, width, height, index } = props as {
                          x: number;
                          y: number;
                          width: number;
                          height: number;
                          index: number;
                        };
                        const item = timePerProject[index];
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            rx={4}
                            fill={item?.project_color || '#3b82f6'}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tasks Completed per Week - Line Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Tasks Completed per Week
              </h3>
              {weeklyCompletion.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-500 py-8 text-center">
                  No completion data for this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={weeklyCompletion}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '0.5rem',
                        color: '#e2e8f0',
                        fontSize: '0.875rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#22c55e' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
