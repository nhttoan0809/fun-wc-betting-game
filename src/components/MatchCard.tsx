import React, { useEffect, useRef } from 'react';
import type { Match, Pick } from '../core/predictionCore';
import {
  sideDisplayName,
  formatHandicap,
  shouldShowDrawOption,
  isKnockout,
  oppositeSide,
} from '../core/predictionCore';
import gsap from 'gsap';
import { Star, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  userPick?: Pick;
  onPick: (selection: 'HOME' | 'DRAW' | 'AWAY', star: boolean) => void;
  simulatedTime: Date;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, userPick, onPick, simulatedTime }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Minutes remaining based on simulated time
  const kickoffDate = new Date(match.kickoff_utc);
  const remainingMs = kickoffDate.getTime() - simulatedTime.getTime();
  const remainingMinutes = remainingMs / 60000;
  const isPastKickoff = remainingMinutes <= 0;

  // Derive active selection and star state
  const selection = userPick?.selection || null;
  const isStar = userPick?.star || false;

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.05 }
      );
    }
  }, []);

  const handleSelectionClick = (sel: 'HOME' | 'DRAW' | 'AWAY') => {
    if (match.status !== 'OPEN' || isPastKickoff) return;

    // Trigger subtle GSAP click effect
    const button = document.getElementById(`btn-${match.match_id}-${sel}`);
    if (button) {
      gsap.fromTo(button, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: 'power2.out' });
    }

    onPick(sel, isStar);
  };

  const handleStarToggle = () => {
    if (match.status !== 'OPEN' || isPastKickoff || !isKnockout(match)) return;
    if (!selection) return; // Must pick a team first

    const starBtn = document.getElementById(`star-${match.match_id}`);
    if (starBtn) {
      gsap.fromTo(
        starBtn,
        { scale: 0.8, rotate: -30 },
        { scale: 1, rotate: 0, duration: 0.3, ease: 'back.out(2)' }
      );
    }

    onPick(selection, !isStar);
  };

  // Determine status color/text
  const getStatusBadge = () => {
    if (match.status === 'SETTLED') {
      return (
        <span className="bg-brand-neon-green/10 border-brand-neon-green/30 text-brand-neon-green rounded-full border px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
          Đã tính điểm
        </span>
      );
    }
    if (isPastKickoff || match.status === 'LOCKED') {
      return (
        <span className="bg-brand-neon-rose/10 border-brand-neon-rose/30 text-brand-neon-rose rounded-full border px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
          Đã khóa
        </span>
      );
    }
    if (match.status === 'OPEN') {
      return (
        <span className="bg-brand-neon-blue/10 border-brand-neon-blue/30 text-brand-neon-blue animate-pulse rounded-full border px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
          Đang mở pick
        </span>
      );
    }
    return (
      <span className="rounded-full border border-gray-300 bg-gray-200 px-2.5 py-1 text-xs font-bold tracking-wider text-gray-600 uppercase dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Chờ mở
      </span>
    );
  };

  // Remaining time text
  const getRemainingTimeText = () => {
    if (isPastKickoff) return 'Đã bắt đầu';
    const totalMinutes = Math.ceil(remainingMinutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `Còn ${minutes} phút`;
    return `Còn ${hours} giờ ${minutes} phút`;
  };

  // Settle calculations
  const isCorrect =
    match.status === 'SETTLED' &&
    match.final_home_score !== null &&
    match.final_away_score !== null &&
    (() => {
      const homeAdjusted = Number(match.final_home_score);
      const awayAdjusted = Number(match.final_away_score);
      const handicap = Number(match.handicap_goals || 0);
      const handicapSide = match.handicap_side || match.favorite_side;
      const givingSide = handicap >= 0 ? handicapSide : oppositeSide(handicapSide);
      const handicapAmount = Math.abs(handicap);

      let homeScoreAdjusted = homeAdjusted;
      let awayScoreAdjusted = awayAdjusted;
      if (givingSide === 'HOME') homeScoreAdjusted -= handicapAmount;
      if (givingSide === 'AWAY') awayScoreAdjusted -= handicapAmount;

      let outcome: 'HOME' | 'DRAW' | 'AWAY' = 'DRAW';
      if (Math.abs(homeScoreAdjusted - awayScoreAdjusted) > 0.000001) {
        outcome = homeScoreAdjusted > awayScoreAdjusted ? 'HOME' : 'AWAY';
      }
      return selection === outcome;
    })();

  const earnedPoints = (() => {
    if (match.status !== 'SETTLED') return 0;
    const starMultiplier = isStar && isKnockout(match);
    return isCorrect ? (starMultiplier ? 2 : 1) : starMultiplier ? -1 : 0;
  })();

  return (
    <div
      ref={cardRef}
      className={`glass-panel glass-panel-hover relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
        match.status === 'SETTLED'
          ? isCorrect
            ? 'border-brand-neon-green/30 bg-brand-neon-green/5 dark:bg-brand-neon-green/5'
            : 'border-brand-neon-rose/20 bg-brand-neon-rose/5 dark:bg-brand-neon-rose/5'
          : ''
      }`}
    >
      {/* Top Header Row */}
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-md bg-gray-200/50 px-2.5 py-1 text-xs font-semibold tracking-wider text-gray-600 uppercase dark:bg-gray-800/40 dark:text-gray-500">
          Vòng {match.stage === 'GROUP' ? 'Bảng' : 'Knockout'} | ID:{' '}
          <span className="font-sport font-bold">{match.match_id}</span>
        </span>
        {getStatusBadge()}
      </div>

      {/* Match Details Area */}
      <div className="relative my-3 text-center">
        <div className="grid grid-cols-11 items-center gap-2">
          {/* Home Team */}
          <div className="col-span-4 flex flex-col items-center">
            <span className="mb-2 text-4xl drop-shadow-md filter">
              {sideDisplayName(match, 'HOME').split(' ')[0]}
            </span>
            <span className="text-base leading-tight font-bold text-gray-900 dark:text-white">
              {match.home_team}
            </span>
          </div>

          {/* VS & Result */}
          <div className="col-span-3 flex flex-col items-center justify-center">
            {match.status === 'SETTLED' ? (
              <div className="flex flex-col items-center">
                <span className="bg-gray-150 font-sport rounded-lg border border-gray-300 px-3 py-1 text-2xl font-black tracking-wider text-gray-800 dark:border-gray-800 dark:bg-gray-900/60 dark:text-white">
                  {match.final_home_score} - {match.final_away_score}
                </span>
                <span className="mt-1 text-[10px] font-semibold text-gray-500 uppercase">FT</span>
              </div>
            ) : (
              <span className="rounded-md border border-gray-300 bg-gray-200/30 px-3 py-1 text-xs font-black text-gray-500 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-600">
                VS
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="col-span-4 flex flex-col items-center">
            <span className="mb-2 text-4xl drop-shadow-md filter">
              {sideDisplayName(match, 'AWAY').split(' ')[0]}
            </span>
            <span className="text-base leading-tight font-bold text-gray-900 dark:text-white">
              {match.away_team}
            </span>
          </div>
        </div>
      </div>

      {/* Handicap details */}
      <div className="dark:bg-brand-dark/40 font-sport my-3 rounded-xl border border-gray-200 bg-gray-50 py-2 text-center dark:border-gray-900/60">
        <span className="text-gray-650 text-xs font-semibold dark:text-gray-300">
          Tỷ lệ: {formatHandicap(match)}
        </span>
      </div>

      {/* Picking Area */}
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {/* Home Pick Button */}
          <button
            id={`btn-${match.match_id}-HOME`}
            disabled={match.status !== 'OPEN' || isPastKickoff}
            onClick={() => handleSelectionClick('HOME')}
            className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              selection === 'HOME'
                ? 'from-brand-neon-blue to-brand-neon-purple shadow-brand-neon-blue/25 bg-gradient-to-r text-white shadow-lg'
                : 'dark:bg-brand-dark/60 dark:border-gray-850 border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white'
            } ${match.status !== 'OPEN' || isPastKickoff ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            {match.home_team}
          </button>

          {/* Draw Button */}
          <button
            id={`btn-${match.match_id}-DRAW`}
            disabled={match.status !== 'OPEN' || isPastKickoff || !shouldShowDrawOption(match)}
            onClick={() => handleSelectionClick('DRAW')}
            title={
              !shouldShowDrawOption(match)
                ? 'Kèo chấp lẻ (0.25, 0.5, 0.75...) không thể xảy ra kết quả Hòa sau khi áp dụng kèo chấp.'
                : 'Dự đoán kết quả Hòa (sau khi áp dụng kèo chấp)'
            }
            className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              selection === 'DRAW'
                ? 'from-brand-neon-blue to-brand-neon-purple shadow-brand-neon-blue/25 bg-gradient-to-r text-white shadow-lg'
                : shouldShowDrawOption(match)
                  ? 'dark:bg-brand-dark/60 dark:border-gray-850 border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white'
                  : 'dark:bg-gray-955 cursor-not-allowed border border-transparent bg-gray-200 text-gray-400 opacity-20 dark:text-gray-800'
            } ${match.status !== 'OPEN' || isPastKickoff ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            Hòa
          </button>

          {/* Away Pick Button */}
          <button
            id={`btn-${match.match_id}-AWAY`}
            disabled={match.status !== 'OPEN' || isPastKickoff}
            onClick={() => handleSelectionClick('AWAY')}
            className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              selection === 'AWAY'
                ? 'from-brand-neon-blue to-brand-neon-purple shadow-brand-neon-blue/25 bg-gradient-to-r text-white shadow-lg'
                : 'dark:bg-brand-dark/60 dark:border-gray-850 border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white'
            } ${match.status !== 'OPEN' || isPastKickoff ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            {match.away_team}
          </button>
        </div>

        {/* Knockout star option */}
        {isKnockout(match) && (
          <div className="bg-brand-neon-purple/5 border-brand-neon-purple/10 flex items-center justify-between rounded-xl border p-2.5">
            <div className="flex items-center gap-2">
              <Star
                size={16}
                className={isStar ? 'fill-brand-gold text-brand-gold' : 'text-brand-neon-purple'}
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Ngôi sao hy vọng
              </span>
            </div>
            <button
              id={`star-${match.match_id}`}
              disabled={match.status !== 'OPEN' || isPastKickoff || !selection}
              onClick={handleStarToggle}
              className={`cursor-pointer rounded-lg px-3 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${
                isStar
                  ? 'bg-brand-gold text-brand-dark glow-gold font-extrabold'
                  : selection
                    ? 'bg-brand-neon-purple/20 text-brand-neon-purple hover:bg-brand-neon-purple/30 border-brand-neon-purple/30 border'
                    : 'cursor-not-allowed border border-transparent bg-gray-200/50 text-gray-400 dark:bg-gray-800/40 dark:text-gray-600'
              }`}
            >
              {isStar ? 'Đang bật' : 'Bật'}
            </button>
          </div>
        )}
      </div>

      {/* Match Footer - Remaining Time or points settlement */}
      <div className="font-sport mt-5 flex items-center justify-between border-t border-gray-200 pt-4 text-xs dark:border-gray-800/80">
        <div className="flex items-center gap-1.5 font-semibold text-gray-600 dark:text-gray-400">
          <Clock size={14} />
          <span>{getRemainingTimeText()}</span>
        </div>
        <div>
          {match.status === 'SETTLED' ? (
            <div className="flex items-center gap-1 font-bold">
              {isCorrect ? (
                <>
                  <CheckCircle2 size={16} className="text-brand-neon-green" />
                  <span className="text-brand-neon-green">+{earnedPoints} điểm</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-brand-neon-rose" />
                  <span className="text-brand-neon-rose">{earnedPoints} điểm</span>
                </>
              )}
            </div>
          ) : selection ? (
            <span className="text-brand-neon-blue font-semibold">Đã dự đoán</span>
          ) : (
            <span className="text-gray-500">Chưa dự đoán</span>
          )}
        </div>
      </div>
    </div>
  );
};
