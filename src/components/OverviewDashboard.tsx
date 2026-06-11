import React, { useEffect, useRef, useMemo, useState } from 'react';
import type { Match, Pick, Player, SelectionType } from '../core/predictionCore';
import {
  teamFlagEmoji,
  formatKickoffTime,
  formatHandicap,
  getHandicapOutcome,
} from '../core/predictionCore';
import gsap from 'gsap';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Lock,
  Activity,
  Users,
  TrendingUp,
  Filter,
} from 'lucide-react';

interface OverviewDashboardProps {
  matches: Match[];
  allPicks: Pick[];
  allPlayers: Player[];
  currentUserId: string;
}

type StageFilter = 'ALL' | 'GROUP' | 'KNOCKOUT';

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  matches,
  allPicks,
  allPlayers,
}) => {
  const statsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');

  const activePlayers = useMemo(() => allPlayers.filter((p) => p.active), [allPlayers]);

  const filteredMatches = useMemo(() => {
    if (stageFilter === 'ALL') return matches;
    return matches.filter((m) => m.stage === stageFilter);
  }, [matches, stageFilter]);

  // Stat calculations
  const stats = useMemo(() => {
    const total = filteredMatches.length;
    const open = filteredMatches.filter((m) => m.status === 'OPEN').length;
    const locked = filteredMatches.filter((m) => m.status === 'LOCKED').length;
    const settled = filteredMatches.filter((m) => m.status === 'SETTLED').length;
    const scheduled = filteredMatches.filter((m) => m.status === 'SCHEDULED').length;

    // Total prediction slots = matches with status OPEN/LOCKED/SETTLED * active players
    const predictableMatches = filteredMatches.filter(
      (m) => m.status === 'OPEN' || m.status === 'LOCKED' || m.status === 'SETTLED'
    );
    const totalSlots = predictableMatches.length * activePlayers.length;
    const filledSlots = allPicks.filter((p) =>
      predictableMatches.some((m) => m.match_id === p.match_id) && p.selection !== null
    ).length;
    const participationRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return { total, open, locked, settled, scheduled, participationRate, totalSlots, filledSlots };
  }, [filteredMatches, allPicks, activePlayers]);

  // Predictive trends per match
  const trends = useMemo(() => {
    const trendMap: Record<
      string,
      { home: number; draw: number; away: number; total: number }
    > = {};

    for (const match of filteredMatches) {
      const matchPicks = allPicks.filter(
        (p) => p.match_id === match.match_id && p.selection !== null
      );
      const home = matchPicks.filter((p) => p.selection === 'HOME').length;
      const draw = matchPicks.filter((p) => p.selection === 'DRAW').length;
      const away = matchPicks.filter((p) => p.selection === 'AWAY').length;
      trendMap[match.match_id] = { home, draw, away, total: home + draw + away };
    }
    return trendMap;
  }, [filteredMatches, allPicks]);

  useEffect(() => {
    if (statsRef.current) {
      gsap.fromTo(
        statsRef.current.children,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      );
    }
    if (listRef.current) {
      gsap.fromTo(
        listRef.current.querySelectorAll('.match-row'),
        { opacity: 0, x: -15 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, [filteredMatches]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Activity size={10} /> Đang mở
          </span>
        );
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
            <Lock size={10} /> Đã khoá
          </span>
        );
      case 'SETTLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-400">
            <CheckCircle2 size={10} /> Kết thúc
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:border-gray-700/40 dark:bg-gray-800/40 dark:text-gray-400">
            <Calendar size={10} /> Chưa bắt đầu
          </span>
        );
      default:
        return null;
    }
  };

  const statCards = [
    {
      label: 'Tổng số trận',
      value: stats.total,
      icon: <BarChart3 size={20} />,
      color: 'text-brand-neon-blue',
      bgGlow: 'glow-blue',
      borderColor: 'border-brand-neon-blue/20 dark:border-brand-neon-blue/30',
    },
    {
      label: 'Đang mở',
      value: stats.open,
      icon: <Activity size={20} />,
      color: 'text-brand-neon-green',
      bgGlow: 'glow-green',
      borderColor: 'border-brand-neon-green/20 dark:border-brand-neon-green/30',
    },
    {
      label: 'Đã khoá',
      value: stats.locked,
      icon: <Lock size={20} />,
      color: 'text-brand-gold',
      bgGlow: 'glow-gold',
      borderColor: 'border-brand-gold/20 dark:border-brand-gold/30',
    },
    {
      label: 'Đã kết thúc',
      value: stats.settled,
      icon: <CheckCircle2 size={20} />,
      color: 'text-brand-neon-purple',
      bgGlow: 'glow-purple',
      borderColor: 'border-brand-neon-purple/20 dark:border-brand-neon-purple/30',
    },
    {
      label: 'Tỉ lệ tham gia',
      value: `${stats.participationRate}%`,
      icon: <Users size={20} />,
      color: 'text-brand-neon-rose',
      bgGlow: '',
      borderColor: 'border-brand-neon-rose/20 dark:border-brand-neon-rose/30',
      subtitle: `${stats.filledSlots}/${stats.totalSlots} lượt vote`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div ref={statsRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`glass-panel glass-panel-hover rounded-2xl border p-5 ${card.borderColor} ${card.bgGlow}`}
          >
            <div className={`mb-3 ${card.color}`}>{card.icon}</div>
            <p className="font-sport text-2xl font-black text-gray-900 dark:text-white">
              {card.value}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {card.label}
            </p>
            {card.subtitle && (
              <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                {card.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Stage Filter */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <TrendingUp size={18} className="text-brand-neon-blue" />
          Xu hướng dự đoán
        </h3>
        <div className="flex items-center gap-1 rounded-xl border border-gray-300/60 bg-gray-200/50 p-1 dark:border-gray-800 dark:bg-gray-900/60">
          <Filter size={14} className="ml-2 text-gray-500" />
          {(['ALL', 'GROUP', 'KNOCKOUT'] as StageFilter[]).map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition-all ${
                stageFilter === stage
                  ? 'bg-brand-neon-blue text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {stage === 'ALL' ? 'Tất cả' : stage === 'GROUP' ? 'Vòng bảng' : 'Knockout'}
            </button>
          ))}
        </div>
      </div>

      {/* Match Timeline */}
      <div ref={listRef} className="space-y-3">
        {filteredMatches.length === 0 && (
          <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-gray-200 py-16 dark:border-gray-800">
            <Calendar size={32} className="mb-3 text-gray-400" />
            <p className="text-sm font-semibold text-gray-500">
              Không có trận đấu nào trong bộ lọc này.
            </p>
          </div>
        )}

        {filteredMatches.map((match) => {
          const trend = trends[match.match_id] || { home: 0, draw: 0, away: 0, total: 0 };
          const isRevealed = match.status === 'LOCKED' || match.status === 'SETTLED';
          const homeFlag = teamFlagEmoji(match.home_team);
          const awayFlag = teamFlagEmoji(match.away_team);

          const homePct = trend.total > 0 ? Math.round((trend.home / trend.total) * 100) : 0;
          const drawPct = trend.total > 0 ? Math.round((trend.draw / trend.total) * 100) : 0;
          const awayPct = trend.total > 0 ? 100 - homePct - drawPct : 0;

          // Determine the handicap outcome for settled matches
          let settledOutcome: SelectionType | null = null;
          if (
            match.status === 'SETTLED' &&
            match.final_home_score !== null &&
            match.final_away_score !== null
          ) {
            settledOutcome = getHandicapOutcome(match, {
              homeScore: match.final_home_score,
              awayScore: match.final_away_score,
            });
          }

          return (
            <div
              key={match.match_id}
              className="match-row glass-panel glass-panel-hover overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                {/* Match Info */}
                <div className="flex flex-1 items-center gap-4">
                  {/* Teams */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{homeFlag}</span>
                      <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                        {match.home_team}
                      </span>
                      <span className="font-sport text-xs font-bold text-gray-400">vs</span>
                      <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                        {match.away_team}
                      </span>
                      <span className="text-xl">{awayFlag}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {getStatusBadge(match.status)}
                      <span className="text-[10px] font-medium text-gray-400">
                        {formatKickoffTime(match.kickoff_utc)}
                      </span>
                      {match.favorite_side && (
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                          • {formatHandicap(match)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score (settled) */}
                  {match.status === 'SETTLED' &&
                    match.final_home_score !== null &&
                    match.final_away_score !== null && (
                      <div className="flex items-center gap-2">
                        <span className="font-sport text-2xl font-black text-gray-900 dark:text-white">
                          {match.final_home_score}
                        </span>
                        <span className="font-sport text-xs font-bold text-gray-400">-</span>
                        <span className="font-sport text-2xl font-black text-gray-900 dark:text-white">
                          {match.final_away_score}
                        </span>
                      </div>
                    )}
                </div>

                {/* Predictive Trend Bar */}
                <div className="w-full sm:w-72">
                  {!isRevealed && match.status !== 'SCHEDULED' ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-100/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                      <Lock size={14} className="text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-400">
                        Xu hướng sẽ hiện sau khi khoá trận
                      </span>
                    </div>
                  ) : match.status === 'SCHEDULED' ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-100/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-400">
                        Chưa có dữ liệu
                      </span>
                    </div>
                  ) : trend.total === 0 ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-100/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                      <span className="text-[11px] font-semibold text-gray-400">
                        Chưa có lượt vote
                      </span>
                    </div>
                  ) : (
                    <div>
                      {/* Percentage labels */}
                      <div className="mb-1.5 flex justify-between text-[10px] font-bold">
                        <span className="text-blue-600 dark:text-blue-400">
                          {homeFlag} {homePct}%
                        </span>
                        {drawPct > 0 && (
                          <span className="text-gray-500">⚖️ {drawPct}%</span>
                        )}
                        <span className="text-rose-600 dark:text-rose-400">
                          {awayPct}% {awayFlag}
                        </span>
                      </div>

                      {/* Stacked bar */}
                      <div className="flex h-3 overflow-hidden rounded-full">
                        {homePct > 0 && (
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out"
                            style={{ width: `${homePct}%` }}
                          />
                        )}
                        {drawPct > 0 && (
                          <div
                            className="bg-gradient-to-r from-gray-400 to-gray-300 transition-all duration-700 ease-out dark:from-gray-600 dark:to-gray-500"
                            style={{ width: `${drawPct}%` }}
                          />
                        )}
                        {awayPct > 0 && (
                          <div
                            className="bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-700 ease-out"
                            style={{ width: `${awayPct}%` }}
                          />
                        )}
                      </div>

                      {/* Vote count */}
                      <p className="mt-1 text-right text-[10px] font-medium text-gray-400">
                        {trend.total} lượt vote
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settled match outcome bar */}
              {match.status === 'SETTLED' && settledOutcome && (
                <div className="border-t border-gray-200 bg-gray-50/50 px-5 py-2 dark:border-gray-800 dark:bg-gray-900/30">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Kết quả kèo:{' '}
                    <span
                      className={
                        settledOutcome === 'HOME'
                          ? 'text-blue-600 dark:text-blue-400'
                          : settledOutcome === 'AWAY'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-600 dark:text-gray-300'
                      }
                    >
                      {settledOutcome === 'HOME'
                        ? `${homeFlag} ${match.home_team} thắng kèo`
                        : settledOutcome === 'AWAY'
                          ? `${awayFlag} ${match.away_team} thắng kèo`
                          : 'Hòa kèo'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
