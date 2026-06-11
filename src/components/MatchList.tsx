import React, { useState } from 'react';
import type { Match, Pick } from '../core/predictionCore';
import { MatchCard } from './MatchCard';
import { Filter } from 'lucide-react';

interface MatchListProps {
  matches: Match[];
  picks: Pick[];
  onPick: (matchId: string, selection: 'HOME' | 'DRAW' | 'AWAY', star: boolean) => void;
  simulatedTime: Date;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, picks, onPick, simulatedTime }) => {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'LOCKED' | 'SETTLED'>('ALL');

  const filteredMatches = matches.filter((match) => {
    const kickoffTime = new Date(match.kickoff_utc).getTime();
    const isPastKickoff = kickoffTime <= simulatedTime.getTime();

    if (filter === 'OPEN') {
      return match.status === 'OPEN' && !isPastKickoff;
    }
    if (filter === 'LOCKED') {
      return (match.status === 'LOCKED' || isPastKickoff) && match.status !== 'SETTLED';
    }
    if (filter === 'SETTLED') {
      return match.status === 'SETTLED';
    }
    return true;
  });

  const getPickForMatch = (matchId: string) => {
    return picks.find((p) => p.match_id === matchId);
  };

  return (
    <div className="space-y-6">
      {/* Filtering Header */}
      <div className="glass-panel flex flex-col items-start justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
          <Filter size={18} className="text-brand-neon-blue" />
          <span>Lọc trận đấu</span>
        </div>
        <div className="dark:bg-brand-dark/50 flex flex-wrap gap-1 rounded-xl border border-gray-300 bg-gray-200/50 p-1 dark:border-gray-900">
          {(['ALL', 'OPEN', 'LOCKED', 'SETTLED'] as const).map((type) => {
            const labelMap = {
              ALL: 'Tất cả',
              OPEN: 'Đang mở',
              LOCKED: 'Đã khóa',
              SETTLED: 'Đã tính điểm',
            };
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${
                  filter === type
                    ? 'bg-brand-neon-blue shadow-brand-neon-blue/20 text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-200/30 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/30 dark:hover:text-white'
                }`}
              >
                {labelMap[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Match Cards */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.match_id}
              match={match}
              userPick={getPickForMatch(match.match_id)}
              onPick={(selection, star) => onPick(match.match_id, selection, star)}
              simulatedTime={simulatedTime}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-800">
          <span className="mb-3 block text-4xl">⚽</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Không tìm thấy trận đấu nào
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'ALL'
              ? 'Chưa có lịch thi đấu được tạo.'
              : filter === 'OPEN'
                ? 'Không có trận đấu nào đang mở pick.'
                : filter === 'LOCKED'
                  ? 'Không có trận đấu nào ở trạng thái khóa.'
                  : 'Chưa có trận đấu nào được tính điểm.'}
          </p>
        </div>
      )}
    </div>
  );
};
