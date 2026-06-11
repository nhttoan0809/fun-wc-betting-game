import React, { useEffect, useRef, useMemo, useState } from 'react';
import type { Match, Pick, Player, SelectionType } from '../core/predictionCore';
import {
  teamFlagEmoji,
  scorePick,
  isKnockout,
  formatKickoffTime,
} from '../core/predictionCore';
import gsap from 'gsap';
import { Search, Lock, Star, Grid3x3 } from 'lucide-react';

interface PickMatrixProps {
  matches: Match[];
  allPicks: Pick[];
  allPlayers: Player[];
  currentUserId: string;
}

type StageFilter = 'ALL' | 'GROUP' | 'KNOCKOUT';

export const PickMatrix: React.FC<PickMatrixProps> = ({
  matches,
  allPicks,
  allPlayers,
  currentUserId,
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');

  const activePlayers = useMemo(() => allPlayers.filter((p) => p.active), [allPlayers]);

  // Filter matches by stage and search query
  const filteredMatches = useMemo(() => {
    let result = matches;
    if (stageFilter !== 'ALL') {
      result = result.filter((m) => m.stage === stageFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.home_team.toLowerCase().includes(q) ||
          m.away_team.toLowerCase().includes(q)
      );
    }
    return result;
  }, [matches, stageFilter, searchQuery]);

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return activePlayers;
    const q = searchQuery.toLowerCase().trim();
    return activePlayers.filter((p) => p.display_name.toLowerCase().includes(q));
  }, [activePlayers, searchQuery]);

  // Build a lookup map: matchId -> userId -> Pick
  const pickMap = useMemo(() => {
    const map: Record<string, Record<string, Pick>> = {};
    for (const pick of allPicks) {
      if (!map[pick.match_id]) map[pick.match_id] = {};
      map[pick.match_id][pick.user_id] = pick;
    }
    return map;
  }, [allPicks]);

  useEffect(() => {
    if (tableRef.current) {
      gsap.fromTo(
        tableRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [filteredMatches, filteredPlayers]);

  const getSelectionLabel = (
    match: Match,
    selection: SelectionType | null,
    hasStar: boolean
  ): React.ReactNode => {
    if (!selection) return <span className="text-gray-400">-</span>;

    const homeFlag = teamFlagEmoji(match.home_team);
    const awayFlag = teamFlagEmoji(match.away_team);

    let label: React.ReactNode;
    if (selection === 'HOME') {
      label = (
        <span className="text-blue-600 dark:text-blue-400">
          {homeFlag} <span className="hidden sm:inline">{match.home_team}</span>
          <span className="sm:hidden">H</span>
        </span>
      );
    } else if (selection === 'AWAY') {
      label = (
        <span className="text-rose-600 dark:text-rose-400">
          {awayFlag} <span className="hidden sm:inline">{match.away_team}</span>
          <span className="sm:hidden">A</span>
        </span>
      );
    } else {
      label = <span className="text-gray-500 dark:text-gray-300">⚖️ <span className="hidden sm:inline">Hòa</span><span className="sm:hidden">D</span></span>;
    }

    return (
      <span className="inline-flex items-center gap-0.5">
        {label}
        {hasStar && isKnockout(match) && (
          <Star size={10} className="text-brand-gold inline fill-current" />
        )}
      </span>
    );
  };

  const getCellStyle = (
    match: Match,
    pick: Pick | undefined,
    playerId: string
  ): { bg: string; scoreLabel: React.ReactNode } => {
    // If the match is OPEN and this is not the current user -> locked
    if (match.status === 'OPEN' && playerId !== currentUserId) {
      return {
        bg: 'bg-gray-100/50 dark:bg-gray-800/30',
        scoreLabel: (
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Lock size={10} /> <span className="text-[10px]">Ẩn</span>
          </span>
        ),
      };
    }

    // No pick
    if (!pick || !pick.selection) {
      return {
        bg: '',
        scoreLabel: <span className="text-gray-300 dark:text-gray-600">-</span>,
      };
    }

    // OPEN match, current user's own pick
    if (match.status === 'OPEN') {
      return {
        bg: 'bg-brand-neon-blue/5 dark:bg-brand-neon-blue/10',
        scoreLabel: getSelectionLabel(match, pick.selection, pick.star),
      };
    }

    // LOCKED match - show pick but no scoring
    if (match.status === 'LOCKED') {
      return {
        bg: '',
        scoreLabel: getSelectionLabel(match, pick.selection, pick.star),
      };
    }

    // SETTLED match - show pick with correct/incorrect coloring and points
    if (
      match.status === 'SETTLED' &&
      match.final_home_score !== null &&
      match.final_away_score !== null
    ) {
      const result = scorePick(match, pick, {
        homeScore: match.final_home_score,
        awayScore: match.final_away_score,
      });

      const bgColor = result.correct
        ? 'bg-emerald-50 dark:bg-emerald-900/20'
        : 'bg-rose-50 dark:bg-rose-900/15';

      const pointsLabel =
        result.points > 0
          ? `+${result.points}đ`
          : result.points < 0
            ? `${result.points}đ`
            : '0đ';

      const pointsColor = result.correct
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-500 dark:text-rose-400';

      return {
        bg: bgColor,
        scoreLabel: (
          <div className="flex flex-col items-center gap-0.5">
            {getSelectionLabel(match, pick.selection, pick.star)}
            <span className={`text-[10px] font-bold ${pointsColor}`}>{pointsLabel}</span>
          </div>
        ),
      };
    }

    // Default: just show label
    return {
      bg: '',
      scoreLabel: getSelectionLabel(match, pick.selection, pick.star),
    };
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Grid3x3 size={18} className="text-brand-neon-purple" />
          Ma trận Vote
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm trận đấu hoặc người chơi..."
              className="w-64 rounded-xl border border-gray-300 bg-white py-2 pr-3 pl-9 text-xs text-gray-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:ring-blue-900/30"
            />
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-300/60 bg-gray-200/50 p-1 dark:border-gray-800 dark:bg-gray-900/60">
            {(['ALL', 'GROUP', 'KNOCKOUT'] as StageFilter[]).map((stage) => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition-all ${
                  stageFilter === stage
                    ? 'bg-brand-neon-purple text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {stage === 'ALL' ? 'Tất cả' : stage === 'GROUP' ? 'Vòng bảng' : 'Knockout'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div
        ref={tableRef}
        className="glass-panel overflow-hidden rounded-2xl border border-gray-200 shadow-xl dark:border-gray-800"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/30 text-[10px] font-bold tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-500">
                <th className="sticky left-0 z-10 min-w-[180px] bg-gray-100/90 px-4 py-3 backdrop-blur-sm dark:bg-gray-900/90">
                  Trận đấu
                </th>
                <th className="min-w-[60px] px-3 py-3 text-center">Tỷ số</th>
                {filteredPlayers.map((player) => (
                  <th
                    key={player.id}
                    className={`min-w-[90px] px-3 py-3 text-center ${
                      player.id === currentUserId
                        ? 'bg-brand-neon-blue/5 dark:bg-brand-neon-blue/10'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="max-w-[80px] truncate">{player.display_name}</span>
                      {player.id === currentUserId && (
                        <span className="rounded bg-brand-neon-blue/20 px-1.5 py-0.5 text-[8px] text-brand-neon-blue font-bold uppercase">
                          Bạn
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/60">
              {filteredMatches.length === 0 && (
                <tr>
                  <td
                    colSpan={filteredPlayers.length + 2}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    Không tìm thấy trận đấu nào.
                  </td>
                </tr>
              )}

              {filteredMatches.map((match) => {
                const homeFlag = teamFlagEmoji(match.home_team);
                const awayFlag = teamFlagEmoji(match.away_team);
                const isSettled = match.status === 'SETTLED';

                return (
                  <tr
                    key={match.match_id}
                    className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                  >
                    {/* Match Info (sticky) */}
                    <td className="sticky left-0 z-10 bg-white/95 px-4 py-3 backdrop-blur-sm dark:bg-gray-950/95">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                          <span>{homeFlag}</span>
                          <span className="max-w-[55px] truncate">{match.home_team}</span>
                          <span className="font-sport text-[10px] text-gray-400">vs</span>
                          <span className="max-w-[55px] truncate">{match.away_team}</span>
                          <span>{awayFlag}</span>
                        </div>
                        <span className="text-[9px] font-medium text-gray-400">
                          {formatKickoffTime(match.kickoff_utc)}
                        </span>
                        {/* Status indicator dot */}
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            match.status === 'OPEN'
                              ? 'bg-emerald-500'
                              : match.status === 'LOCKED'
                                ? 'bg-amber-500'
                                : match.status === 'SETTLED'
                                  ? 'bg-blue-500'
                                  : 'bg-gray-400'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-3 py-3 text-center">
                      {isSettled &&
                      match.final_home_score !== null &&
                      match.final_away_score !== null ? (
                        <span className="font-sport text-sm font-black text-gray-900 dark:text-white">
                          {match.final_home_score}-{match.final_away_score}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>

                    {/* Player Picks */}
                    {filteredPlayers.map((player) => {
                      const pick = pickMap[match.match_id]?.[player.id];
                      const cell = getCellStyle(match, pick, player.id);

                      return (
                        <td
                          key={player.id}
                          className={`px-3 py-3 text-center text-[11px] font-semibold ${cell.bg} ${
                            player.id === currentUserId
                              ? 'border-l border-r border-brand-neon-blue/10 dark:border-brand-neon-blue/20'
                              : ''
                          }`}
                        >
                          {cell.scoreLabel}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-[10px] font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
        <span className="font-bold uppercase text-gray-400">Chú thích:</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-emerald-50 border border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700/40" />
          Đúng
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-rose-50 border border-rose-300 dark:bg-rose-900/15 dark:border-rose-700/40" />
          Sai
        </span>
        <span className="inline-flex items-center gap-1">
          <Lock size={10} /> Ẩn (trận đang mở)
        </span>
        <span className="inline-flex items-center gap-1">
          <Star size={10} className="text-brand-gold fill-current" /> Ngôi sao hy vọng
        </span>
      </div>
    </div>
  );
};
