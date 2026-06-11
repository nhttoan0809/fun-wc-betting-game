import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Award, ShieldAlert, Trophy } from 'lucide-react';

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  points: number;
  correct_picks: number;
  settled_matches: number;
}

interface LeaderboardProps {
  rows: LeaderboardRow[];
  currentUserId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ rows, currentUserId }) => {
  const podiumRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Sort rows: Points desc, correct picks desc, display name asc
  const sortedRows = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.correct_picks !== a.correct_picks) return b.correct_picks - a.correct_picks;
    return a.display_name.localeCompare(b.display_name);
  });

  const top3 = sortedRows.slice(0, 3);

  // Position top3 as: 2nd, 1st, 3rd for standard podium visual
  const orderedPodium = [];
  if (top3[1]) orderedPodium.push({ ...top3[1], rank: 2 });
  if (top3[0]) orderedPodium.push({ ...top3[0], rank: 1 });
  if (top3[2]) orderedPodium.push({ ...top3[2], rank: 3 });

  useEffect(() => {
    if (podiumRef.current) {
      gsap.fromTo(
        podiumRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
      );
    }

    if (tableRef.current) {
      gsap.fromTo(
        tableRef.current.querySelectorAll('tbody tr'),
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, [rows]);

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-brand-gold/10 border-brand-gold/40 text-brand-gold';
    if (rank === 2) return 'bg-slate-300/10 border-slate-300/30 text-slate-500 dark:text-slate-300';
    return 'bg-amber-700/10 border-amber-700/30 text-amber-700';
  };

  const getPodiumHeight = (rank: number) => {
    if (rank === 1) return 'h-48 md:h-56 border-brand-gold/30 bg-brand-gold/5';
    if (rank === 2)
      return 'h-40 md:h-48 border-gray-300 dark:border-gray-400/20 bg-gray-200/20 dark:bg-gray-400/5';
    return 'h-32 md:h-40 border-amber-300 dark:border-amber-700/20 bg-amber-100/20 dark:bg-amber-700/5';
  };

  return (
    <div className="space-y-8">
      {/* Visual Podium for Top 3 */}
      {top3.length > 0 && (
        <div
          ref={podiumRef}
          className="mx-auto grid max-w-2xl grid-cols-3 items-end justify-center gap-3 px-4 pt-8 md:gap-6"
        >
          {orderedPodium.map((player) => (
            <div
              key={player.user_id}
              className={`glass-panel relative flex flex-col items-center justify-end rounded-2xl border p-4 md:p-6 ${getPodiumHeight(
                player.rank
              )}`}
            >
              {/* Rank Marker */}
              <div
                className={`absolute -top-5 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black md:text-base ${
                  player.rank === 1
                    ? 'bg-brand-gold dark:border-brand-dark text-brand-dark shadow-brand-gold/30 border-white shadow-lg'
                    : player.rank === 2
                      ? 'dark:border-brand-dark text-brand-dark border-white bg-slate-300 shadow-lg shadow-slate-300/30'
                      : 'dark:border-brand-dark border-white bg-amber-700 text-white'
                }`}
              >
                {player.rank}
              </div>

              {/* Avatar Icon */}
              <div className="mb-2 md:mb-3">
                {player.rank === 1 ? (
                  <Trophy size={32} className="text-brand-gold animate-bounce" />
                ) : (
                  <Award
                    size={28}
                    className={
                      player.rank === 2 ? 'text-slate-400 dark:text-slate-300' : 'text-amber-700'
                    }
                  />
                )}
              </div>

              {/* Details */}
              <span className="max-w-full truncate text-center text-xs font-bold text-gray-900 md:text-sm dark:text-white">
                {player.display_name}
              </span>
              <span className="mt-1 text-lg font-black text-gray-900 md:text-2xl dark:text-white">
                {player.points} pts
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-gray-600 uppercase dark:text-gray-500">
                {player.correct_picks}/{player.settled_matches} thắng
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Table for the rest */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-gray-200 shadow-xl dark:border-gray-800">
        <div className="border-gray-250 flex items-center justify-between border-b p-5 dark:border-gray-800/80">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Trophy size={20} className="text-brand-neon-blue" />
            Bảng Xếp Hạng Tổng Sắp
          </h2>
          <span className="dark:bg-gray-955 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 dark:border-gray-900 dark:text-gray-500">
            {rows.length} Người chơi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full border-collapse text-left">
            <thead>
              <tr className="text-gray-550 dark:bg-gray-955/20 border-b border-gray-200 bg-gray-100/30 text-xs font-bold tracking-wider uppercase dark:border-gray-900 dark:text-gray-500">
                <th className="w-16 px-6 py-4 text-center">Hạng</th>
                <th className="px-6 py-4">Người chơi</th>
                <th className="px-6 py-4 text-center">Đã đấu</th>
                <th className="px-6 py-4 text-center">Thắng</th>
                <th className="px-6 py-4 text-center">Tỷ lệ thắng</th>
                <th className="px-6 py-4 pr-8 text-right">Điểm số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-900/60">
              {sortedRows.map((player, idx) => {
                const isCurrentUser = player.user_id === currentUserId;
                const winRate =
                  player.settled_matches > 0
                    ? Math.round((player.correct_picks / player.settled_matches) * 100)
                    : 0;

                return (
                  <tr
                    key={player.user_id}
                    className={`transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-800/10 ${
                      isCurrentUser ? 'bg-brand-neon-blue/5 border-brand-neon-blue border-l-2' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          idx < 3
                            ? getRankBadgeColor(idx + 1)
                            : 'border-gray-250 border bg-gray-100 text-gray-500 dark:border-gray-900 dark:bg-gray-950 dark:text-gray-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-955 flex items-center gap-2 text-sm font-bold dark:text-white">
                        {player.display_name}
                        {isCurrentUser && (
                          <span className="bg-brand-neon-blue/20 text-brand-neon-blue border-brand-neon-blue/30 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase">
                            Bạn
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                      {player.settled_matches}
                    </td>
                    <td className="text-brand-neon-green px-6 py-4 text-center text-sm font-medium">
                      {player.correct_picks}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full border border-gray-300 bg-gray-200 dark:border-gray-900 dark:bg-gray-950">
                          <div
                            className="bg-brand-neon-blue h-full rounded-full"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs font-bold text-gray-600 dark:text-gray-400">
                          {winRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 pr-8 text-right text-base font-black text-gray-900 dark:text-white">
                      {player.points} pts
                    </td>
                  </tr>
                );
              })}

              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    <ShieldAlert size={24} className="mx-auto mb-2 text-gray-600" />
                    Chưa có dữ liệu xếp hạng. Hãy tính điểm các trận đấu trước.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
